/**
 * Date filtering utility for events.
 * Filters events based on temporal relevance: includes future events within 30 days
 * and currently ongoing events, excludes past events and those too far in the future.
 */

import type { Event } from '../types/index.js';

/**
 * Checks whether two dates fall on the same calendar day.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Filters an array of events by temporal relevance.
 *
 * An event is included if:
 * - (a) Its dateStart is in the future but within 30 days from `now`, OR
 * - (b) It is currently ongoing: dateStart <= now AND (dateEnd > now OR
 *        dateEnd is null/undefined with dateStart being today)
 *
 * All events with dateStart fully in the past (and not ongoing) or with
 * dateStart more than 30 days in the future are excluded.
 *
 * @param events - Array of events with dateStart and optional dateEnd (ISO strings)
 * @param now - The current date/time to evaluate against
 * @returns Filtered array of temporally relevant events
 */
export function filterByDate<T extends { dateStart: string; dateEnd?: string }>(
  events: T[],
  now: Date
): T[] {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const maxFutureDate = new Date(now.getTime() + thirtyDaysMs);

  return events.filter((event) => {
    const start = new Date(event.dateStart);

    // (a) Future event within 30 days
    if (start > now && start <= maxFutureDate) {
      return true;
    }

    // (b) Currently ongoing event: start <= now
    if (start <= now) {
      if (event.dateEnd != null && event.dateEnd !== '') {
        // Has an end date: include if end is still in the future
        const end = new Date(event.dateEnd);
        return end > now;
      }
      // No end date: include only if start is today
      return isSameDay(start, now);
    }

    // start > maxFutureDate — too far in the future
    return false;
  });
}
