/**
 * Combined event filtering utility.
 * Applies multiple filter criteria simultaneously using AND logic.
 */

import type { Event } from '../types/index.js';

/**
 * Filter criteria for events.
 * All fields are optional — undefined/empty fields are skipped.
 */
export interface EventFilters {
  categories?: string[];      // filter by category (include only these)
  dateFrom?: string;          // ISO date string - include events on or after this date
  dateTo?: string;            // ISO date string - include events on or before this date
  maxDistanceKm?: number;     // max distance (requires distanceKm on event)
}

/**
 * An event with an optional computed distance field.
 */
type EventWithDistance = Event & { distanceKm?: number };

/**
 * Applies all active filters to an array of events using AND logic.
 * If a filter field is undefined or empty, that filter is skipped.
 * Returns only events that pass ALL active filters.
 *
 * @param events - Array of events (with optional distanceKm field)
 * @param filters - Filter criteria to apply
 * @returns Filtered array of events satisfying all active filters
 */
export function applyFilters(
  events: EventWithDistance[],
  filters: EventFilters
): EventWithDistance[] {
  return events.filter((event) => {
    // Category filter: include only events whose category is in the list
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(event.category)) {
        return false;
      }
    }

    // Date range filter (from): include events on or after dateFrom
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      const eventDate = new Date(event.dateStart);
      if (eventDate < from) {
        return false;
      }
    }

    // Date range filter (to): include events on or before dateTo
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      const eventDate = new Date(event.dateStart);
      if (eventDate > to) {
        return false;
      }
    }

    // Max distance filter: include only events within maxDistanceKm
    if (filters.maxDistanceKm !== undefined) {
      if (event.distanceKm === undefined || event.distanceKm > filters.maxDistanceKm) {
        return false;
      }
    }

    return true;
  });
}
