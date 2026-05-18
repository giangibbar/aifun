import { describe, it, expect } from 'vitest';
import { applyFilters, type EventFilters } from '../../utils/filters.js';
import type { Event } from '../../types/index.js';

function makeEvent(overrides: Partial<Event & { distanceKm?: number }> = {}): Event & { distanceKm?: number } {
  return {
    id: 1,
    name: 'Test Event',
    dateStart: '2025-01-15T20:00:00Z',
    venueName: 'Test Venue',
    lat: 45.0,
    lng: 9.0,
    category: 'musica',
    sourceUrl: 'https://example.com',
    sourceId: 1,
    scrapedAt: '2025-01-10T10:00:00Z',
    ...overrides,
  };
}

describe('applyFilters', () => {
  const events = [
    makeEvent({ id: 1, category: 'musica', dateStart: '2025-01-15T20:00:00Z', distanceKm: 5 }),
    makeEvent({ id: 2, category: 'teatro', dateStart: '2025-01-20T19:00:00Z', distanceKm: 12 }),
    makeEvent({ id: 3, category: 'sport', dateStart: '2025-02-01T10:00:00Z', distanceKm: 25 }),
    makeEvent({ id: 4, category: 'musica', dateStart: '2025-02-10T21:00:00Z', distanceKm: 3 }),
  ];

  it('returns all events when no filters are active', () => {
    const result = applyFilters(events, {});
    expect(result).toHaveLength(4);
  });

  it('filters by categories', () => {
    const filters: EventFilters = { categories: ['musica'] };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.category === 'musica')).toBe(true);
  });

  it('filters by multiple categories', () => {
    const filters: EventFilters = { categories: ['musica', 'teatro'] };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(3);
  });

  it('skips category filter when categories array is empty', () => {
    const filters: EventFilters = { categories: [] };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(4);
  });

  it('filters by dateFrom', () => {
    const filters: EventFilters = { dateFrom: '2025-01-20T00:00:00Z' };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(2);
  });

  it('filters by dateTo', () => {
    const filters: EventFilters = { dateTo: '2025-01-20T19:00:00Z' };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(2);
  });

  it('filters by date range (dateFrom + dateTo)', () => {
    const filters: EventFilters = {
      dateFrom: '2025-01-16T00:00:00Z',
      dateTo: '2025-02-05T00:00:00Z',
    };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([2, 3]);
  });

  it('filters by maxDistanceKm', () => {
    const filters: EventFilters = { maxDistanceKm: 10 };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(2);
    expect(result.every(e => (e.distanceKm ?? Infinity) <= 10)).toBe(true);
  });

  it('excludes events without distanceKm when maxDistanceKm is set', () => {
    const eventsWithMissing = [
      makeEvent({ id: 1, distanceKm: 5 }),
      makeEvent({ id: 2, distanceKm: undefined }),
    ];
    const filters: EventFilters = { maxDistanceKm: 10 };
    const result = applyFilters(eventsWithMissing, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('applies all filters simultaneously (AND logic)', () => {
    const filters: EventFilters = {
      categories: ['musica'],
      dateFrom: '2025-01-01T00:00:00Z',
      dateTo: '2025-01-31T23:59:59Z',
      maxDistanceKm: 10,
    };
    const result = applyFilters(events, filters);
    // Only event 1: musica, Jan 15, distance 5km
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns empty array when no events match all filters', () => {
    const filters: EventFilters = {
      categories: ['sport'],
      maxDistanceKm: 2,
    };
    const result = applyFilters(events, filters);
    expect(result).toHaveLength(0);
  });
});
