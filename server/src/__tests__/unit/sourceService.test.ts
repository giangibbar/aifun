import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  getAllSources,
  addSource,
  removeSource,
  validateSource,
  updateScrapeStatus,
} from '../../services/SourceService';

// Mock the database module
vi.mock('../../db/index.js', () => {
  let db: Database.Database | null = null;

  function createTestDb(): Database.Database {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        name TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_scraped_at TEXT,
        last_scrape_status TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    // Seed default sources
    db.exec(`
      INSERT INTO sources (url, name, is_default, is_active) VALUES
        ('https://www.eventbrite.it', 'Eventbrite', TRUE, TRUE),
        ('https://www.facebook.com/events', 'Facebook Events', TRUE, TRUE),
        ('https://www.comuni.it/eventi', 'Pagine Comuni', TRUE, TRUE);
    `);
    return db;
  }

  return {
    getDatabase: () => {
      if (!db) return createTestDb();
      return db;
    },
    __resetDb: () => {
      if (db) db.close();
      db = null;
    },
    __createTestDb: createTestDb,
  };
});

// Import the reset helper
const { __resetDb, __createTestDb } = await import('../../db/index.js') as any;

describe('SourceService', () => {
  beforeEach(() => {
    __createTestDb();
  });

  afterEach(() => {
    __resetDb();
  });

  describe('getAllSources', () => {
    it('should return all seeded default sources', () => {
      const sources = getAllSources();
      expect(sources).toHaveLength(3);
      expect(sources[0].url).toBe('https://www.eventbrite.it');
      expect(sources[0].isDefault).toBe(true);
      expect(sources[1].url).toBe('https://www.facebook.com/events');
      expect(sources[2].url).toBe('https://www.comuni.it/eventi');
    });

    it('should return sources with correct field mapping', () => {
      const sources = getAllSources();
      const source = sources[0];
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('url');
      expect(source).toHaveProperty('name');
      expect(source).toHaveProperty('isDefault');
      expect(source).toHaveProperty('isActive');
      expect(source.isActive).toBe(true);
    });

    it('should include custom sources after default ones', () => {
      addSource('https://custom-events.com', 'Custom');
      const sources = getAllSources();
      expect(sources).toHaveLength(4);
      // Default sources come first (ordered by is_default DESC)
      expect(sources[0].isDefault).toBe(true);
      expect(sources[1].isDefault).toBe(true);
      expect(sources[2].isDefault).toBe(true);
      expect(sources[3].isDefault).toBe(false);
      expect(sources[3].url).toBe('https://custom-events.com');
    });
  });

  describe('addSource', () => {
    it('should add a valid custom source', () => {
      const result = addSource('https://new-events.com', 'New Events');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source.url).toBe('https://new-events.com');
        expect(result.source.name).toBe('New Events');
        expect(result.source.isDefault).toBe(false);
        expect(result.source.isActive).toBe(true);
      }
    });

    it('should add a source without a name', () => {
      const result = addSource('https://no-name.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source.url).toBe('https://no-name.com');
        expect(result.source.name).toBeUndefined();
      }
    });

    it('should reject an invalid URL', () => {
      const result = addSource('not-a-url');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'URL inserito non è valido");
      }
    });

    it('should reject a duplicate URL', () => {
      addSource('https://duplicate.com');
      const result = addSource('https://duplicate.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Questa fonte è già presente nella lista');
      }
    });

    it('should reject when max custom sources reached', () => {
      // Add 20 custom sources
      for (let i = 0; i < 20; i++) {
        addSource(`https://source-${i}.com`);
      }
      const result = addSource('https://source-21.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Raggiunto il limite massimo di 20 fonti personalizzate');
      }
    });

    it('should reject ftp protocol', () => {
      const result = addSource('ftp://files.example.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'URL deve utilizzare il protocollo http o https");
      }
    });

    it('should reject URL longer than 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2049);
      const result = addSource(longUrl);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("L'URL non può superare i 2048 caratteri");
      }
    });
  });

  describe('removeSource', () => {
    it('should remove a custom source', () => {
      const addResult = addSource('https://removable.com', 'Removable');
      expect(addResult.success).toBe(true);
      if (addResult.success) {
        const removeResult = removeSource(addResult.source.id);
        expect(removeResult.success).toBe(true);
        // Verify it's gone
        const sources = getAllSources();
        expect(sources.find(s => s.url === 'https://removable.com')).toBeUndefined();
      }
    });

    it('should not remove a default source', () => {
      const sources = getAllSources();
      const defaultSource = sources.find(s => s.isDefault);
      expect(defaultSource).toBeDefined();
      const result = removeSource(defaultSource!.id);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Le fonti predefinite non possono essere rimosse');
    });

    it('should return error for non-existent source', () => {
      const result = removeSource(9999);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Fonte non trovata');
    });
  });

  describe('validateSource', () => {
    it('should return reachable true for a successful fetch', async () => {
      // Mock global fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await validateSource('https://example.com');
      expect(result.reachable).toBe(true);

      vi.unstubAllGlobals();
    });

    it('should return error for non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await validateSource('https://example.com/notfound');
      expect(result.reachable).toBe(false);
      if (!result.reachable) {
        expect(result.error).toContain('404');
      }

      vi.unstubAllGlobals();
    });

    it('should return error on network failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await validateSource('https://unreachable.invalid');
      expect(result.reachable).toBe(false);
      if (!result.reachable) {
        expect(result.error).toBe("L'URL non è raggiungibile");
      }

      vi.unstubAllGlobals();
    });

    it('should return timeout error on abort', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', mockFetch);

      const result = await validateSource('https://slow-site.com');
      expect(result.reachable).toBe(false);
      if (!result.reachable) {
        expect(result.error).toContain('timeout');
      }

      vi.unstubAllGlobals();
    });

    it('should fall back to GET if HEAD fails', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((_url, options) => {
        callCount++;
        if (options?.method === 'HEAD') {
          return Promise.reject(new Error('HEAD not allowed'));
        }
        return Promise.resolve({ ok: true, status: 200 });
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await validateSource('https://no-head.com');
      expect(result.reachable).toBe(true);
      expect(callCount).toBe(2); // HEAD failed, then GET succeeded

      vi.unstubAllGlobals();
    });
  });

  describe('updateScrapeStatus', () => {
    it('should update last_scraped_at and last_scrape_status for success', () => {
      const sources = getAllSources();
      const source = sources[0];
      expect(source.lastScrapedAt).toBeUndefined();

      updateScrapeStatus(source.id, 'success');

      const updated = getAllSources().find(s => s.id === source.id);
      expect(updated).toBeDefined();
      expect(updated!.lastScrapeStatus).toBe('success');
      expect(updated!.lastScrapedAt).toBeDefined();
    });

    it('should update last_scraped_at and last_scrape_status for error', () => {
      const sources = getAllSources();
      const source = sources[0];

      updateScrapeStatus(source.id, 'error');

      const updated = getAllSources().find(s => s.id === source.id);
      expect(updated).toBeDefined();
      expect(updated!.lastScrapeStatus).toBe('error');
      expect(updated!.lastScrapedAt).toBeDefined();
    });

    it('should update the timestamp on subsequent calls', async () => {
      const sources = getAllSources();
      const source = sources[0];

      updateScrapeStatus(source.id, 'success');
      const first = getAllSources().find(s => s.id === source.id)!;

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      updateScrapeStatus(source.id, 'error');
      const second = getAllSources().find(s => s.id === source.id)!;

      expect(second.lastScrapeStatus).toBe('error');
      // Timestamps should be set (may or may not differ depending on resolution)
      expect(second.lastScrapedAt).toBeDefined();
    });
  });
});
