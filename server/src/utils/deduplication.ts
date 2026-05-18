import { Event } from '../types/index.js';

/**
 * Normalizes a string for comparison by:
 * - Trimming whitespace
 * - Converting to lowercase
 * - Removing all punctuation characters
 */
export function normalizeString(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO datetime string
 * for same-day comparison.
 */
function extractDay(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}

/**
 * Deduplicates an array of events based on normalized name, same day,
 * and normalized venue name. For each group of duplicates, only the
 * first encountered event is preserved.
 *
 * Normalization rules:
 * - Name and venue: lowercase, trim, remove punctuation
 * - Date: compare same day (ignore time component)
 */
export function deduplicateEvents(events: Event[]): Event[] {
  const seen = new Set<string>();
  const result: Event[] = [];

  for (const event of events) {
    const key = [
      normalizeString(event.name),
      extractDay(event.dateStart),
      normalizeString(event.venueName),
    ].join('|');

    if (!seen.has(key)) {
      seen.add(key);
      result.push(event);
    }
  }

  return result;
}
