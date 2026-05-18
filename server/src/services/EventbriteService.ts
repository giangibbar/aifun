/**
 * EventbriteService — Scrapes events from Eventbrite.
 * Uses city-based URL for local search, coordinate-based for wider radius.
 */

import * as cheerio from "cheerio";
import type { Event, EventCategory } from "../types/index.js";

export class EventbriteService {
  async searchByLocation(lat: number, lng: number, radiusKm: number): Promise<Event[]> {
    // Get city name for local search
    const city = await this.getCityName(lat, lng);
    // Always search by city for local events
    const urls: string[] = [];
    if (city) urls.push("https://www.eventbrite.it/d/italy--" + encodeURIComponent(city) + "/events/");
    // For large radius, also search by coordinates
    if (radiusKm > 30) urls.push("https://www.eventbrite.it/d/italy/events/?loc=" + lat + "%2C" + lng + "&distance=" + radiusKm + "km");
    if (!urls.length) urls.push("https://www.eventbrite.it/d/italy/events/?loc=" + lat + "%2C" + lng + "&distance=" + radiusKm + "km");

    const allEvents: Event[] = [];
    const seen = new Set<string>();
    for (const url of urls) {

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const events = this.parseEvents(html, lat, lng);
      for (const e of events) { const key = e.name + e.dateStart; if (!seen.has(key)) { seen.add(key); allEvents.push(e); } }
    } catch (err) {
      console.error("Eventbrite scrape error:", (err as Error).message);
      continue;
    }
  }
    return allEvents;
  }

  private async getCityName(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { "User-Agent": "AiFun/1.0" }, signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json() as { address?: { city?: string; town?: string; municipality?: string } };
      return data.address?.city || data.address?.town || data.address?.municipality || "";
    } catch { return ""; }
  }

  private parseEvents(html: string, lat: number, lng: number): Event[] {
    const $ = cheerio.load(html);
    const events: Event[] = [];
    const scripts = $("script").toArray();
    for (const script of scripts) {
      const text = $(script).html() || "";
      if (!text.includes("__SERVER_DATA__")) continue;
      const match = text.match(/__SERVER_DATA__\s*=\s*(.+);/s);
      if (!match) continue;
      try {
        const data = JSON.parse(match[1]);
        const jsonld = data.jsonld?.[0]?.itemListElement || [];
        for (const item of jsonld) {
          const e = item.item;
          if (!e) continue;
          const eLat = e.location?.geo?.latitude ? parseFloat(e.location.geo.latitude) : lat;
          const eLng = e.location?.geo?.longitude ? parseFloat(e.location.geo.longitude) : lng;
          events.push({
            id: 0,
            name: e.name || "Untitled",
            dateStart: e.startDate || new Date().toISOString(),
            dateEnd: e.endDate,
            venueName: e.location?.name || "Unknown",
            venueAddress: e.location?.address?.streetAddress,
            lat: eLat,
            lng: eLng,
            description: e.description?.substring(0, 200),
            category: this.guessCategory(e.name || ""),
            sourceUrl: e.url || "",
            sourceId: null as any,
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch {}
    }
    return events;
  }

  private guessCategory(name: string): EventCategory {
    const n = name.toLowerCase();
    if (/concert|music|dj|live|band|gospel|jazz|rock/.test(n)) return "musica";
    if (/teatro|spettacol|commedia/.test(n)) return "teatro";
    if (/cinema|film|proiezion/.test(n)) return "cinema";
    if (/arte|mostra|esposizion|gallery|museo/.test(n)) return "arte";
    if (/sport|corsa|maratona|calcio|yoga|fitness/.test(n)) return "sport";
    if (/food|cucina|degustazion|vino|aperitivo|brunch/.test(n)) return "food";
    if (/festival|fest/.test(n)) return "festival";
    if (/conferenz|workshop|seminario|corso|webinar|masterclass/.test(n)) return "conferenza";
    if (/party|club|disco|night/.test(n)) return "nightlife";
    return "altro";
  }
}
