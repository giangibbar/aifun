/**
 * Event routes — POST /api/events/search, GET /api/events/:id
 */

import { Router, Request, Response } from 'express';
import { validateRadius } from '../utils/validation.js';
import { paginateEvents } from '../utils/pagination.js';
import { applyFilters } from '../utils/filters.js';
import { haversineDistanceKm } from '../utils/geo.js';
import { CacheService } from '../services/CacheService.js';
import { EventScraperService } from '../services/EventScraperService.js';
import { getDatabase } from '../db/index.js';
import type { SearchEventsRequest, SearchEventsResponse, EventSummary } from '../types/index.js';

export const eventsRouter = Router();

const cacheService = new CacheService();

/**
 * POST /api/events/search
 * Search events by position and radius with optional filters and pagination.
 */
eventsRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const body = req.body as SearchEventsRequest;
    const { lat, lng, radiusKm, filters, page = 1, pageSize = 20 } = body;

    // Validate required fields
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat e lng sono obbligatori' });
    }

    // Validate radius
    const radiusValidation = validateRadius(radiusKm);
    if (!radiusValidation.valid) {
      return res.status(400).json({ error: radiusValidation.error });
    }

    // Get events (from cache or scraping — no LLM needed)
    const scraper = new EventScraperService(cacheService);
    const events = await scraper.searchEvents(lat, lng, radiusValidation.value);

    // Add distance to each event
    const eventsWithDistance = events.map((event) => ({
      ...event,
      distanceKm: haversineDistanceKm(lat, lng, event.lat, event.lng),
    }));

    // Apply filters
    const filtered = filters
      ? applyFilters(eventsWithDistance, {
          categories: filters.categories,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          maxDistanceKm: filters.maxDistanceKm,
        })
      : eventsWithDistance;

    // Sort by date
    const sorted = filtered.sort(
      (a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );

    // Convert to EventSummary
    const summaries: EventSummary[] = sorted.map((e) => ({
      id: e.id,
      name: e.name,
      dateStart: e.dateStart,
      venueName: e.venueName,
      distanceKm: e.distanceKm ?? 0,
      lat: e.lat + (Math.random() - 0.5) * 0.005,
      lng: e.lng + (Math.random() - 0.5) * 0.005,
      category: e.category,
      sourceUrl: (e as any).sourceUrl || "",
      description: (e as any).description || "",
      dateEnd: (e as any).dateEnd || "",
      venueAddress: (e as any).venueAddress || "",
    }));

    // Paginate
    const paginated = paginateEvents(summaries, page, pageSize);

    const response: SearchEventsResponse = {
      events: paginated.items,
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      hasMore: paginated.hasMore,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Event search error:', error.message);
    res.status(500).json({ error: 'Errore durante la ricerca degli eventi' });
  }
});

/**
 * GET /api/events/:id
 * Get full event details by ID.
 */
eventsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID evento non valido' });
    }

    const db = getDatabase();
    const row = db.prepare(`
      SELECT id, name, date_start, date_end, venue_name, venue_address,
             lat, lng, description, category, source_url, source_id, scraped_at
      FROM events WHERE id = ?
    `).get(id) as any;

    if (!row) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }

    res.json({
      id: row.id,
      name: row.name,
      dateStart: row.date_start,
      dateEnd: row.date_end || undefined,
      venueName: row.venue_name,
      venueAddress: row.venue_address || undefined,
      lat: row.lat,
      lng: row.lng,
      description: row.description || undefined,
      category: row.category,
      sourceUrl: row.source_url,
      sourceId: row.source_id,
      scrapedAt: row.scraped_at,
    });
  } catch (error: any) {
    console.error('Event detail error:', error.message);
    res.status(500).json({ error: 'Errore nel recupero dei dettagli evento' });
  }
});
