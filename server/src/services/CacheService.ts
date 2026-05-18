/**
 * CacheService — Manages event caching in SQLite with a 1-hour TTL.
 *
 * Provides methods to check, retrieve, store, and invalidate cached events
 * based on geographic position and radius. Uses an approximate bounding box
 * to determine if cached events cover the requested area.
 *
 * Requirements: 3.1 (performance)
 */

import { getDatabase } from '../db/index.js';
import type { Event } from '../types/index.js';

/** Cache time-to-live: 1 hour in milliseconds */
const CACHE_TTL_MS = 3600000;

/** Tolerance for position matching (approx 1km in degrees) */
const POSITION_TOLERANCE_DEG = 0.01;

export class CacheService {
  /**
   * Retrieve cached events for a given position and radius.
   * Returns the events array if cache is valid (< 1 hour old), or null if stale/empty.
   */
  getCachedEvents(lat: number, lng: number, radiusKm: number): Event[] | null {
    if (!this.isCacheValid(lat, lng, radiusKm)) {
      return null;
    }

    const db = getDatabase();
    const cutoff = this.getCutoffISO();

    // Compute a bounding box for the approximate area
    const { latMin, latMax, lngMin, lngMax } = this.getBoundingBox(lat, lng, radiusKm);

    const rows = db.prepare(`
      SELECT id, name, date_start, date_end, venue_name, venue_address,
             lat, lng, description, category, source_url, source_id, scraped_at
      FROM events
      WHERE scraped_at > ?
        AND lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    `).all(cutoff, latMin, latMax, lngMin, lngMax) as EventRow[];

    if (rows.length === 0) {
      return null;
    }

    return rows.map(this.rowToEvent);
  }

  /**
   * Store events in the events table with the current timestamp as scraped_at.
   */
  cacheEvents(events: Event[]): void {
    if (events.length === 0) return;

    const db = getDatabase();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO events (name, date_start, date_end, venue_name, venue_address,
                          lat, lng, description, category, source_url, source_id, scraped_at)
      VALUES (@name, @dateStart, @dateEnd, @venueName, @venueAddress,
              @lat, @lng, @description, @category, @sourceUrl, @sourceId, @scrapedAt)
    `);

    const insertMany = db.transaction((evts: Event[]) => {
      for (const event of evts) {
        insertStmt.run({
          name: event.name,
          dateStart: event.dateStart,
          dateEnd: event.dateEnd ?? null,
          venueName: event.venueName,
          venueAddress: event.venueAddress ?? null,
          lat: event.lat,
          lng: event.lng,
          description: event.description ?? null,
          category: event.category,
          sourceUrl: event.sourceUrl,
          sourceId: event.sourceId,
          scrapedAt: now,
        });
      }
    });

    insertMany(events);
  }

  /**
   * Delete events older than 1 hour from the events table.
   */
  invalidateCache(): void {
    const db = getDatabase();
    const cutoff = this.getCutoffISO();

    db.prepare(`DELETE FROM events WHERE scraped_at <= ?`).run(cutoff);
  }

  /**
   * Check if there are recent events (< 1 hour old) in the approximate area.
   */
  isCacheValid(lat: number, lng: number, radiusKm: number): boolean {
    const db = getDatabase();
    const cutoff = this.getCutoffISO();

    const { latMin, latMax, lngMin, lngMax } = this.getBoundingBox(lat, lng, radiusKm);

    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM events
      WHERE scraped_at > ?
        AND lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    `).get(cutoff, latMin, latMax, lngMin, lngMax) as { count: number };

    return row.count > 0;
  }

  /**
   * Compute the ISO timestamp for the cache cutoff (1 hour ago).
   */
  private getCutoffISO(): string {
    return new Date(Date.now() - CACHE_TTL_MS).toISOString();
  }

  /**
   * Compute a bounding box around a center point given a radius in km.
   * Uses approximate degree-to-km conversion.
   */
  private getBoundingBox(lat: number, lng: number, radiusKm: number) {
    // 1 degree latitude ≈ 111 km
    const latDelta = radiusKm / 111;
    // 1 degree longitude ≈ 111 * cos(lat) km
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    return {
      latMin: lat - latDelta,
      latMax: lat + latDelta,
      lngMin: lng - lngDelta,
      lngMax: lng + lngDelta,
    };
  }

  /**
   * Map a database row to an Event object.
   */
  private rowToEvent(row: EventRow): Event {
    return {
      id: row.id,
      name: row.name,
      dateStart: row.date_start,
      dateEnd: row.date_end ?? undefined,
      venueName: row.venue_name,
      venueAddress: row.venue_address ?? undefined,
      lat: row.lat,
      lng: row.lng,
      description: row.description ?? undefined,
      category: row.category as Event['category'],
      sourceUrl: row.source_url,
      sourceId: row.source_id,
      scrapedAt: row.scraped_at,
    };
  }
}

/** Internal type representing a raw database row from the events table. */
interface EventRow {
  id: number;
  name: string;
  date_start: string;
  date_end: string | null;
  venue_name: string;
  venue_address: string | null;
  lat: number;
  lng: number;
  description: string | null;
  category: string;
  source_url: string;
  source_id: number;
  scraped_at: string;
}

export const cacheService = new CacheService();
