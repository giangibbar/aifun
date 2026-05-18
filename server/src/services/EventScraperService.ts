/**
 * EventScraperService — Scrapes event data from configured sources using Cheerio.
 * No LLM dependency — uses structured selectors and JSON-LD/microdata extraction.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import * as cheerio from 'cheerio';
import { EventbriteService } from "./EventbriteService.js";
import { getLocalSources } from "./LocalSourcesService.js";
import { TodayScraperService } from "./TodayScraperService.js";
import { getDatabase } from '../db/index.js';
import { CacheService } from './CacheService.js';
import { deduplicateEvents } from '../utils/deduplication.js';
import { filterByDate } from '../utils/dateFilter.js';
import { filterByDistance } from '../utils/geo.js';
import type { Event, EventCategory } from '../types/index.js';

const SOURCE_TIMEOUT_MS = 10_000;

const VALID_CATEGORIES: EventCategory[] = [
  'musica', 'teatro', 'cinema', 'arte', 'sport',
  'food', 'nightlife', 'festival', 'conferenza', 'altro',
];

export class EventScraperService {
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  /**
   * Search events from configured sources within the given radius.
   * Uses cache if available (< 1 hour), otherwise scrapes.
   */
  async searchEvents(lat: number, lng: number, radiusKm: number): Promise<Event[]> {
    const cached = this.cacheService.getCachedEvents(lat, lng, radiusKm);
    if (cached) {
      const eb = await new EventbriteService().searchByLocation(lat, lng, radiusKm);
      return [...filterByDistance(cached, lat, lng, radiusKm), ...filterByDistance(eb, lat, lng, radiusKm)];
    }

    const [scraped, eventbrite, todayEvents] = await Promise.all([this.scrapeAllSources(), new EventbriteService().searchByLocation(lat, lng, radiusKm), new TodayScraperService().scrapeByLocation(lat, lng, radiusKm)]);
    const events = [...scraped, ...todayEvents];
    const dateFiltered = filterByDate(events, new Date());
    const deduplicated = deduplicateEvents(dateFiltered);

    if (deduplicated.length > 0) {
      this.cacheService.cacheEvents(deduplicated);
    }

    const localResults = filterByDistance(deduplicated, lat, lng, radiusKm);
    return [...localResults, ...filterByDistance(eventbrite, lat, lng, radiusKm)];
  }

  /**
   * Scrape all active sources.
   */
  private async scrapeAllSources(): Promise<Event[]> {
    const db = getDatabase();
    const sources = db.prepare(
      'SELECT * FROM sources WHERE is_active = TRUE'
    ).all() as Array<{ id: number; url: string; name: string | null }>;

    const allEvents: Event[] = [];

    const results = await Promise.allSettled(
      sources.map((source) => this.scrapeSource(source))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const source = sources[i];

      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
        this.logScrape(source.id, 'success', result.value.length);
      } else {
        const msg = result.reason?.message || 'Unknown error';
        const status = msg.includes('timeout') ? 'timeout' : 'parse_error';
        this.logScrape(source.id, status, 0, msg);
      }
    }

    return allEvents;
  }

  /**
   * Scrape a single source: fetch HTML, extract events via structured parsing.
   */
  private async scrapeSource(source: { id: number; url: string }): Promise<Event[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LocalEventsFinder/1.0',
          'Accept': 'text/html',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.extractEventsFromHTML(html, source);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('timeout');
      }
      throw error;
    }
  }

  /**
   * Extract events from HTML using JSON-LD, microdata, and common patterns.
   */
  private extractEventsFromHTML(html: string, source: { id: number; url: string }): Event[] {
    const $ = cheerio.load(html);
    const events: Event[] = [];

    // 1. Try JSON-LD (schema.org/Event)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        const items = Array.isArray(json) ? json : json['@graph'] || [json];

        for (const item of items) {
          if (item['@type'] === 'Event' || item['@type']?.includes?.('Event')) {
            const event = this.parseSchemaOrgEvent(item, source);
            if (event) events.push(event);
          }
        }
      } catch { /* skip invalid JSON-LD */ }
    });

    // 2. Try microdata (itemtype Event)
    $('[itemtype*="schema.org/Event"]').each((_, el) => {
      const event = this.parseMicrodataEvent($, $(el), source);
      if (event) events.push(event);
    });

    // 3. Fallback: look for common event patterns in HTML
    if (events.length === 0) {
      const fallbackEvents = this.extractFromCommonPatterns($, source);
      events.push(...fallbackEvents);
    }

    return events;
  }

  /**
   * Parse a schema.org JSON-LD Event object.
   */
  private parseSchemaOrgEvent(item: any, source: { id: number; url: string }): Event | null {
    const name = item.name;
    const dateStart = item.startDate;
    const venueName = item.location?.name || item.location?.address || 'Venue sconosciuta';

    if (!name || !dateStart) return null;

    const date = new Date(dateStart);
    if (isNaN(date.getTime())) return null;

    return {
      id: 0,
      name: String(name).trim(),
      dateStart: date.toISOString(),
      dateEnd: item.endDate ? new Date(item.endDate).toISOString() : undefined,
      venueName: String(venueName).trim(),
      venueAddress: this.extractAddress(item.location),
      lat: this.extractLat(item.location) || 0,
      lng: this.extractLng(item.location) || 0,
      description: item.description ? String(item.description).slice(0, 500) : undefined,
      category: this.guessCategory(name, item.description || ''),
      sourceUrl: source.url,
      sourceId: source.id,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * Parse microdata Event element.
   */
  private parseMicrodataEvent($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>, source: { id: number; url: string }): Event | null {
    const name = el.find('[itemprop="name"]').first().text().trim();
    const dateStart = el.find('[itemprop="startDate"]').first().attr('content') ||
                      el.find('[itemprop="startDate"]').first().text().trim();

    if (!name || !dateStart) return null;

    const date = new Date(dateStart);
    if (isNaN(date.getTime())) return null;

    const venueName = el.find('[itemprop="location"] [itemprop="name"]').first().text().trim() || 'Venue sconosciuta';
    const venueAddress = el.find('[itemprop="location"] [itemprop="address"]').first().text().trim() || undefined;

    return {
      id: 0,
      name,
      dateStart: date.toISOString(),
      dateEnd: undefined,
      venueName,
      venueAddress,
      lat: 0,
      lng: 0,
      description: el.find('[itemprop="description"]').first().text().trim().slice(0, 500) || undefined,
      category: this.guessCategory(name, ''),
      sourceUrl: source.url,
      sourceId: source.id,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * Fallback: extract events from common HTML patterns.
   */
  private extractFromCommonPatterns($: cheerio.CheerioAPI, source: { id: number; url: string }): Event[] {
    const events: Event[] = [];

    // Look for elements with event-like class names
    const selectors = [
      '.event', '.evento', '[class*="event"]', '[class*="evento"]',
      'article[class*="event"]', '.event-card', '.event-item',
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const name = $el.find('h1, h2, h3, h4, .title, .event-title, .nome').first().text().trim();
        const dateText = $el.find('time, .date, .data, [datetime]').first().attr('datetime') ||
                         $el.find('time, .date, .data').first().text().trim();

        if (!name || name.length < 3) return;

        let dateStart: string | null = null;
        if (dateText) {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            dateStart = parsed.toISOString();
          }
        }

        if (!dateStart) return;

        const venueName = $el.find('.venue, .luogo, .location').first().text().trim() || 'Venue sconosciuta';

        events.push({
          id: 0,
          name,
          dateStart,
          dateEnd: undefined,
          venueName,
          venueAddress: undefined,
          lat: 0,
          lng: 0,
          description: $el.find('.description, .descrizione, p').first().text().trim().slice(0, 500) || undefined,
          category: this.guessCategory(name, ''),
          sourceUrl: source.url,
          sourceId: source.id,
          scrapedAt: new Date().toISOString(),
        });
      });

      if (events.length > 0) break; // Stop at first matching selector
    }

    return events;
  }

  /**
   * Guess event category from name and description using keywords.
   */
  private guessCategory(name: string, description: string): EventCategory {
    const text = `${name} ${description}`.toLowerCase();

    const keywords: Record<EventCategory, string[]> = {
      musica: ['concerto', 'musica', 'live', 'dj', 'band', 'jazz', 'rock', 'rap', 'acoustic'],
      teatro: ['teatro', 'spettacolo', 'commedia', 'dramma', 'recital', 'opera'],
      cinema: ['cinema', 'film', 'proiezione', 'screening'],
      arte: ['mostra', 'arte', 'esposizione', 'galleria', 'exhibition', 'pittura'],
      sport: ['sport', 'partita', 'gara', 'torneo', 'calcio', 'basket', 'corsa'],
      food: ['food', 'cibo', 'degustazione', 'cena', 'aperitivo', 'brunch', 'sagra'],
      nightlife: ['disco', 'club', 'party', 'festa', 'serata', 'notte'],
      festival: ['festival', 'fiera', 'rassegna', 'kermesse'],
      conferenza: ['conferenza', 'workshop', 'seminario', 'talk', 'meetup', 'webinar'],
      altro: [],
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (category === 'altro') continue;
      if (words.some((w) => text.includes(w))) {
        return category as EventCategory;
      }
    }

    return 'altro';
  }

  private extractAddress(location: any): string | undefined {
    if (!location) return undefined;
    if (typeof location.address === 'string') return location.address;
    if (typeof location.address === 'object') {
      const a = location.address;
      return [a.streetAddress, a.addressLocality, a.postalCode].filter(Boolean).join(', ') || undefined;
    }
    return undefined;
  }

  private extractLat(location: any): number | null {
    return location?.geo?.latitude ? parseFloat(location.geo.latitude) : null;
  }

  private extractLng(location: any): number | null {
    return location?.geo?.longitude ? parseFloat(location.geo.longitude) : null;
  }

  private logScrape(sourceId: number, status: string, eventsFound: number, errorMessage?: string): void {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO scrape_logs (source_id, status, events_found, error_message, duration_ms)
         VALUES (?, ?, ?, ?, 0)`
      ).run(sourceId, status, eventsFound, errorMessage || null);

      db.prepare(
        `UPDATE sources SET last_scraped_at = ?, last_scrape_status = ?, updated_at = ? WHERE id = ?`
      ).run(now, status === 'success' ? 'success' : 'error', now, sourceId);
    } catch { /* non-critical */ }
  }
}
