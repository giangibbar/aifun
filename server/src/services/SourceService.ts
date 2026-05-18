/**
 * SourceService — CRUD operations for event sources in SQLite.
 * Handles source management, URL validation, and scrape status tracking.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { getDatabase } from '../db/index.js';
import { Source } from '../types/index.js';
import { validateSourceAddition } from '../utils/validateSource.js';

/** Timeout for URL reachability check (10 seconds) */
const URL_VALIDATION_TIMEOUT_MS = 10_000;

/**
 * Result of source validation (reachability + content check).
 */
export type SourceValidationResult =
  | { reachable: true }
  | { reachable: false; error: string };

/**
 * Result of adding a source.
 */
export type AddSourceResult =
  | { success: true; source: Source }
  | { success: false; error: string };

/**
 * Maps a database row to a Source domain object.
 */
function mapRowToSource(row: Record<string, unknown>): Source {
  return {
    id: row.id as number,
    url: row.url as string,
    name: (row.name as string) || undefined,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    lastScrapedAt: (row.last_scraped_at as string) || undefined,
    lastScrapeStatus: (row.last_scrape_status as 'success' | 'error') || undefined,
  };
}

/**
 * Get all sources from the database.
 */
export function getAllSources(): Source[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM sources ORDER BY is_default DESC, created_at ASC').all();
  return rows.map((row) => mapRowToSource(row as Record<string, unknown>));
}

/**
 * Add a new custom source.
 * Validates the URL using validateSourceAddition (format, length, count limit).
 * Does NOT perform reachability check — use validateSource() separately for that.
 *
 * @param url - The source URL to add
 * @param name - Optional display name for the source
 * @returns AddSourceResult indicating success with the created source, or failure with error
 */
export function addSource(url: string, name?: string): AddSourceResult {
  const db = getDatabase();

  // Count current custom (non-default) sources
  const countRow = db.prepare('SELECT COUNT(*) as count FROM sources WHERE is_default = FALSE').get() as { count: number };
  const currentCount = countRow.count;

  // Validate using the shared validation utility
  const validation = validateSourceAddition(url, currentCount);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check for duplicate URL
  const existing = db.prepare('SELECT id FROM sources WHERE url = ?').get(url);
  if (existing) {
    return { success: false, error: 'Questa fonte è già presente nella lista' };
  }

  // Insert the new source
  const result = db.prepare(
    `INSERT INTO sources (url, name, is_default, is_active)
     VALUES (?, ?, FALSE, TRUE)`
  ).run(url, name || null);

  const insertedId = result.lastInsertRowid as number;

  // Retrieve and return the inserted source
  const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(insertedId) as Record<string, unknown>;
  return { success: true, source: mapRowToSource(row) };
}

/**
 * Remove a custom source by ID.
 * Default sources cannot be removed.
 *
 * @param id - The source ID to remove
 * @returns true if removed, false if not found or is a default source
 */
export function removeSource(id: number): { success: boolean; error?: string } {
  const db = getDatabase();

  // Check if source exists and is not default
  const source = db.prepare('SELECT id, is_default FROM sources WHERE id = ?').get(id) as { id: number; is_default: number } | undefined;

  if (!source) {
    return { success: false, error: 'Fonte non trovata' };
  }

  if (source.is_default) {
    return { success: false, error: 'Le fonti predefinite non possono essere rimosse' };
  }

  db.prepare('DELETE FROM sources WHERE id = ?').run(id);
  return { success: true };
}

/**
 * Validate that a URL is reachable by performing a HEAD/GET request with a 10-second timeout.
 *
 * @param url - The URL to validate
 * @returns SourceValidationResult indicating reachability
 */
export async function validateSource(url: string): Promise<SourceValidationResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), URL_VALIDATION_TIMEOUT_MS);

    // Try HEAD first (lighter), fall back to GET if HEAD fails
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'LocalEventsFinder/1.0',
        },
      });
    } catch {
      // Some servers reject HEAD, try GET
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'LocalEventsFinder/1.0',
        },
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { reachable: false, error: `L'URL ha restituito lo stato HTTP ${response.status}` };
    }

    return { reachable: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { reachable: false, error: "L'URL non è raggiungibile (timeout di 10 secondi superato)" };
    }
    return { reachable: false, error: "L'URL non è raggiungibile" };
  }
}

/**
 * Update the scrape status and timestamp for a source.
 *
 * @param id - The source ID to update
 * @param status - The scrape result status ('success' or 'error')
 */
export function updateScrapeStatus(id: number, status: 'success' | 'error'): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE sources
     SET last_scraped_at = ?, last_scrape_status = ?, updated_at = ?
     WHERE id = ?`
  ).run(now, status, now, id);
}
