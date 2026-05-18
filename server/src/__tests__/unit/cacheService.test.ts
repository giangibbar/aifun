import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { CacheService } from '../../services/CacheService.js';
import type { Event } from '../../types/index.js';

// Mock the database module
vi.mock('../../db/index.js', () => {
  let mockDb: Database.Database | null = null;

  return {
    getDatabase: () => {
      if (!mockDb) {
        mockDb = new Database(':memory:');
        mockDb.exec(`
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            date_start TEXT NOT NULL,
            date_end TEXT,
            venue_name TEXT NOT NULL,
            venue_address TEXT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            source_url TEXT NOT NULL,
            source_id INTEGER,
            scraped_at TEXT DEFAULT (datetime('now')),
            created_at TEXT DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_events_coords ON events(lat, lng);
        `);
      }
      return mockDb;
    },
    __resetDb: () => {
      if (mockDb) {
        mockDb.close();
        mockDb = null;
      }
    },
    __getDb: () => mockDb,
  };
});

// Import after mock setup
const { getDatabase, __resetDb } = await import('../../db/index.js') as any;

function createTestEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    name: 'Test Event',
    dateStart: '2025-01-15T20:00:00.000Z',
    venueName: 'Test Venue',
    venueAddress: 'Via Roma 1',
    lat: 41.9028,
    lng: 12.4964,
    category: 'musica',
    sourceUrl: 'https://example.com/event',
    sourceId: 1,
    scrapedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    __resetDb();
    cacheService = new CacheService();
  });

  afterEach(() => {
    __resetDb();
  });

  describe('cacheEvents', () => {
    it('should store events in the database', () => {
      const events = [createTestEvent(), createTestEvent({ name: 'Event 2', lat: 41.91, lng: 12.50 })];

      cacheService.cacheEvents(events);

      const db = getDatabase();
      const rows = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
      expect(rows.count).toBe(2);
    });

    it('should set scraped_at to current time', () => {
      const before = new Date().toISOString();
      cacheService.cacheEvents([createTestEvent()]);
      const after = new Date().toISOString();

      const db = getDatabase();
      const row = db.prepare('SELECT scraped_at FROM events LIMIT 1').get() as { scraped_at: string };

      expect(row.scraped_at >= before).toBe(true);
      expect(row.scraped_at <= after).toBe(true);
    });

    it('should do nothing for empty events array', () => {
      cacheService.cacheEvents([]);

      const db = getDatabase();
      const rows = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
      expect(rows.count).toBe(0);
    });

    it('should handle events with optional fields as null', () => {
      const event = createTestEvent({
        dateEnd: undefined,
        venueAddress: undefined,
        description: undefined,
      });

      cacheService.cacheEvents([event]);

      const db = getDatabase();
      const row = db.prepare('SELECT date_end, venue_address, description FROM events LIMIT 1').get() as any;
      expect(row.date_end).toBeNull();
      expect(row.venue_address).toBeNull();
      expect(row.description).toBeNull();
    });
  });

  describe('isCacheValid', () => {
    it('should return false when no events exist', () => {
      const result = cacheService.isCacheValid(41.9028, 12.4964, 15);
      expect(result).toBe(false);
    });

    it('should return true when recent events exist in the area', () => {
      cacheService.cacheEvents([createTestEvent()]);

      const result = cacheService.isCacheValid(41.9028, 12.4964, 15);
      expect(result).toBe(true);
    });

    it('should return false when events are outside the area', () => {
      cacheService.cacheEvents([createTestEvent({ lat: 45.0, lng: 7.0 })]);

      // Search near Rome, event is near Turin
      const result = cacheService.isCacheValid(41.9028, 12.4964, 15);
      expect(result).toBe(false);
    });

    it('should return false when events are older than 1 hour', () => {
      const db = getDatabase();
      const oldTime = new Date(Date.now() - 3700000).toISOString(); // 1h + 100s ago

      db.prepare(`
        INSERT INTO events (name, date_start, venue_name, lat, lng, category, source_url, source_id, scraped_at)
        VALUES ('Old Event', '2025-01-15T20:00:00Z', 'Venue', 41.9028, 12.4964, 'musica', 'https://example.com', 1, ?)
      `).run(oldTime);

      const result = cacheService.isCacheValid(41.9028, 12.4964, 15);
      expect(result).toBe(false);
    });
  });

  describe('getCachedEvents', () => {
    it('should return null when cache is empty', () => {
      const result = cacheService.getCachedEvents(41.9028, 12.4964, 15);
      expect(result).toBeNull();
    });

    it('should return events when cache is valid', () => {
      const event = createTestEvent();
      cacheService.cacheEvents([event]);

      const result = cacheService.getCachedEvents(41.9028, 12.4964, 15);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(result![0].name).toBe('Test Event');
      expect(result![0].venueName).toBe('Test Venue');
      expect(result![0].category).toBe('musica');
    });

    it('should return null when events are stale', () => {
      const db = getDatabase();
      const oldTime = new Date(Date.now() - 3700000).toISOString();

      db.prepare(`
        INSERT INTO events (name, date_start, venue_name, lat, lng, category, source_url, source_id, scraped_at)
        VALUES ('Old Event', '2025-01-15T20:00:00Z', 'Venue', 41.9028, 12.4964, 'musica', 'https://example.com', 1, ?)
      `).run(oldTime);

      const result = cacheService.getCachedEvents(41.9028, 12.4964, 15);
      expect(result).toBeNull();
    });

    it('should map database rows to Event objects correctly', () => {
      const event = createTestEvent({
        name: 'Concerto Jazz',
        dateEnd: '2025-01-15T23:00:00.000Z',
        venueAddress: 'Via Veneto 10',
        description: 'Un bel concerto',
      });
      cacheService.cacheEvents([event]);

      const result = cacheService.getCachedEvents(41.9028, 12.4964, 15);
      expect(result).not.toBeNull();
      const cached = result![0];
      expect(cached.name).toBe('Concerto Jazz');
      expect(cached.dateEnd).toBe('2025-01-15T23:00:00.000Z');
      expect(cached.venueAddress).toBe('Via Veneto 10');
      expect(cached.description).toBe('Un bel concerto');
      expect(cached.lat).toBe(41.9028);
      expect(cached.lng).toBe(12.4964);
      expect(cached.sourceUrl).toBe('https://example.com/event');
      expect(cached.sourceId).toBe(1);
    });
  });

  describe('invalidateCache', () => {
    it('should delete events older than 1 hour', () => {
      const db = getDatabase();
      const oldTime = new Date(Date.now() - 3700000).toISOString();

      db.prepare(`
        INSERT INTO events (name, date_start, venue_name, lat, lng, category, source_url, source_id, scraped_at)
        VALUES ('Old Event', '2025-01-15T20:00:00Z', 'Venue', 41.9028, 12.4964, 'musica', 'https://example.com', 1, ?)
      `).run(oldTime);

      // Also add a fresh event
      cacheService.cacheEvents([createTestEvent({ name: 'Fresh Event' })]);

      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
      expect(beforeCount.count).toBe(2);

      cacheService.invalidateCache();

      const afterCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
      expect(afterCount.count).toBe(1);

      const remaining = db.prepare('SELECT name FROM events').get() as { name: string };
      expect(remaining.name).toBe('Fresh Event');
    });

    it('should not delete recent events', () => {
      cacheService.cacheEvents([createTestEvent()]);

      cacheService.invalidateCache();

      const db = getDatabase();
      const count = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
      expect(count.count).toBe(1);
    });

    it('should handle empty table gracefully', () => {
      expect(() => cacheService.invalidateCache()).not.toThrow();
    });
  });
});
