/**
 * TodayScraperService — Scrapes events from *Today.it network.
 * Dynamically finds cities in radius and scrapes their Today pages.
 */

import * as cheerio from "cheerio";
import { geocodingService } from "./GeocodingService.js";
import type { Event, EventCategory } from "../types/index.js";

export class TodayScraperService {
  async scrapeByLocation(lat: number, lng: number, radiusKm: number): Promise<Event[]> {
    const cities = await this.getCitiesInRadius(lat, lng, radiusKm);
    if (!cities.length) return [];

    const results = await Promise.allSettled(
      cities.slice(0, 4).map(city => this.scrapeCity(city))
    );

    const allEvents: Event[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const e of r.value) {
          const key = e.name + e.dateStart;
          if (!seen.has(key)) { seen.add(key); allEvents.push(e); }
        }
      }
    }
    return allEvents;
  }

  private async getCitiesInRadius(lat: number, lng: number, radiusKm: number): Promise<string[]> {
    const mainCity = await this.reverseGeocode(lat, lng);
    const cities = mainCity ? [mainCity] : [];

    if (radiusKm > 40) {
      try {
        const degRadius = radiusKm / 111;
        const url = "https://nominatim.openstreetmap.org/search?format=json" +
          "&viewbox=" + (lng - degRadius) + "," + (lat + degRadius) + "," + (lng + degRadius) + "," + (lat - degRadius) +
          "&bounded=1&limit=8&featuretype=city&q=city";
        const res = await fetch(url, { headers: { "User-Agent": "AiFun/1.0" }, signal: AbortSignal.timeout(5000) });
        const data = await res.json() as Array<{ display_name: string }>;
        for (const d of data) {
          const name = d.display_name.split(",")[0].trim().toLowerCase();
          if (name && name.length > 2 && !cities.includes(name)) cities.push(name);
        }
      } catch {}
    }
    return cities;
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng + "&format=json&zoom=10",
        { headers: { "User-Agent": "AiFun/1.0" }, signal: AbortSignal.timeout(5000) });
      const data = await res.json() as any;
      return (data.address?.city || data.address?.town || "").toLowerCase();
    } catch { return ""; }
  }

  private async scrapeCity(city: string): Promise<Event[]> {
    const slug = city.replace(/\s+/g, "");
    const baseUrl = "https://www." + slug + "today.it/eventi/";
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 86400000);
    const from = today.toISOString().split("T")[0];
    const to = nextWeek.toISOString().split("T")[0];
    const listUrl = baseUrl + "dal/" + from + "/al/" + to + "/";

    try {
      const res = await fetch(listUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const html = await res.text();
      const $ = cheerio.load(html);
      const rawEvents: Array<{ name: string; venue: string; url: string }> = [];
      const seen = new Set<string>();

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (!href.match(/\/eventi\/[a-z0-9-]+\.html$/)) return;
        const full = href.startsWith("http") ? href : "https://www." + slug + "today.it" + href;
        if (seen.has(full)) return;
        seen.add(full);

        let name = $(el).text().trim();
        if (!name || name.length < 5) {
          name = $(el).closest("h2,h3,article").find("h2,h3").first().text().trim();
        }
        if (!name || name.length < 5) return;

        // Extract venue from nearby text if available
        const venue = $(el).closest("article,.event,.evento").find(".venue,.luogo,.location,address").first().text().trim();
        rawEvents.push({ name, venue, url: full });
      });

      // Geocode venues in batches (max 5 to respect Nominatim rate limits)
      const events: Event[] = [];
      const geocodeCache = new Map<string, { lat: number; lng: number }>();

      for (const raw of rawEvents) {
        const query = raw.venue || raw.name.split(/\s+a\s+|\s+@\s+|\s+-\s+/).pop() || city;
        const cacheKey = query.toLowerCase();

        let coords = geocodeCache.get(cacheKey);
        if (!coords && geocodeCache.size < 5) {
          try {
            const result = await geocodingService.geocode(query + ", " + city + ", Italia");
            if (result) { coords = result; geocodeCache.set(cacheKey, coords); }
          } catch {}
          // Nominatim rate limit: 1 req/sec
          await new Promise(r => setTimeout(r, 1100));
        }

        events.push({
          id: 0,
          name: raw.name,
          dateStart: from,
          dateEnd: to,
          venueName: raw.venue || city.charAt(0).toUpperCase() + city.slice(1),
          venueAddress: "",
          lat: coords?.lat || 0,
          lng: coords?.lng || 0,
          description: "",
          category: this.guessCategory(raw.name),
          sourceUrl: raw.url,
          sourceId: null as any,
          scrapedAt: new Date().toISOString(),
        });
      }

      return events;
    } catch { return []; }
  }

  private guessCategory(name: string): EventCategory {
    const n = name.toLowerCase();
    if (/concert|music|dj|live|band|gospel|jazz|rock|cantaut/.test(n)) return "musica";
    if (/teatro|spettacol|commedia|palco/.test(n)) return "teatro";
    if (/cinema|film|proiezion/.test(n)) return "cinema";
    if (/arte|mostra|esposizion|gallery|museo/.test(n)) return "arte";
    if (/sport|corsa|maratona|calcio|yoga|fitness|marcia|giro/.test(n)) return "sport";
    if (/food|cucina|degustazion|vino|aperitivo|brunch|focaccia|sagra|gastr/.test(n)) return "food";
    if (/festival|fest/.test(n)) return "festival";
    if (/conferenz|workshop|seminario|corso|webinar|masterclass|incontro/.test(n)) return "conferenza";
    if (/party|club|disco|night/.test(n)) return "nightlife";
    return "altro";
  }
}
