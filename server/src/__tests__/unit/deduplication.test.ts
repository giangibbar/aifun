import { describe, it, expect } from 'vitest';
import { deduplicateEvents, normalizeString } from '../../utils/deduplication.js';
import { Event } from '../../types/index.js';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    name: 'Test Event',
    dateStart: '2024-06-15T20:00:00Z',
    venueName: 'Test Venue',
    venueAddress: '123 Main St',
    lat: 45.0,
    lng: 9.0,
    category: 'musica',
    sourceUrl: 'https://example.com',
    sourceId: 1,
    scrapedAt: '2024-06-01T10:00:00Z',
    ...overrides,
  };
}

describe('normalizeString', () => {
  it('should lowercase and trim', () => {
    expect(normalizeString('  Hello World  ')).toBe('hello world');
  });

  it('should remove punctuation', () => {
    expect(normalizeString("Rock'n'Roll!")).toBe('rocknroll');
  });

  it('should handle multiple spaces', () => {
    expect(normalizeString('foo   bar')).toBe('foo bar');
  });

  it('should handle empty string', () => {
    expect(normalizeString('')).toBe('');
  });

  it('should remove commas, periods, and special characters', () => {
    expect(normalizeString('Hello, World! (2024)')).toBe('hello world 2024');
  });
});

describe('deduplicateEvents', () => {
  it('should return empty array for empty input', () => {
    expect(deduplicateEvents([])).toEqual([]);
  });

  it('should return single event unchanged', () => {
    const event = makeEvent();
    expect(deduplicateEvents([event])).toEqual([event]);
  });

  it('should keep both events when names differ', () => {
    const e1 = makeEvent({ id: 1, name: 'Concert A' });
    const e2 = makeEvent({ id: 2, name: 'Concert B' });
    expect(deduplicateEvents([e1, e2])).toHaveLength(2);
  });

  it('should keep both events when dates differ', () => {
    const e1 = makeEvent({ id: 1, dateStart: '2024-06-15T20:00:00Z' });
    const e2 = makeEvent({ id: 2, dateStart: '2024-06-16T20:00:00Z' });
    expect(deduplicateEvents([e1, e2])).toHaveLength(2);
  });

  it('should keep both events when venues differ', () => {
    const e1 = makeEvent({ id: 1, venueName: 'Venue A' });
    const e2 = makeEvent({ id: 2, venueName: 'Venue B' });
    expect(deduplicateEvents([e1, e2])).toHaveLength(2);
  });

  it('should remove duplicate with same normalized name, day, and venue', () => {
    const e1 = makeEvent({ id: 1, name: 'Rock Concert', dateStart: '2024-06-15T20:00:00Z', venueName: 'Blue Note' });
    const e2 = makeEvent({ id: 2, name: 'rock concert', dateStart: '2024-06-15T21:00:00Z', venueName: 'blue note' });
    const result = deduplicateEvents([e1, e2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1); // preserves first
  });

  it('should treat events with different times on same day as duplicates', () => {
    const e1 = makeEvent({ id: 1, dateStart: '2024-06-15T18:00:00Z' });
    const e2 = makeEvent({ id: 2, dateStart: '2024-06-15T22:00:00Z' });
    const result = deduplicateEvents([e1, e2]);
    expect(result).toHaveLength(1);
  });

  it('should handle punctuation differences in names', () => {
    const e1 = makeEvent({ id: 1, name: "Rock'n'Roll Night!" });
    const e2 = makeEvent({ id: 2, name: 'Rock n Roll Night' });
    const result = deduplicateEvents([e1, e2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should handle punctuation differences in venue names', () => {
    const e1 = makeEvent({ id: 1, venueName: "Joe's Bar & Grill" });
    const e2 = makeEvent({ id: 2, venueName: 'Joes Bar  Grill' });
    const result = deduplicateEvents([e1, e2]);
    expect(result).toHaveLength(1);
  });

  it('should preserve all unique events in a mixed list', () => {
    const events = [
      makeEvent({ id: 1, name: 'Event A', dateStart: '2024-06-15T20:00:00Z', venueName: 'Venue 1' }),
      makeEvent({ id: 2, name: 'Event B', dateStart: '2024-06-15T20:00:00Z', venueName: 'Venue 1' }),
      makeEvent({ id: 3, name: 'Event A', dateStart: '2024-06-15T21:00:00Z', venueName: 'Venue 1' }), // dup of id:1
      makeEvent({ id: 4, name: 'Event A', dateStart: '2024-06-16T20:00:00Z', venueName: 'Venue 1' }), // different day
      makeEvent({ id: 5, name: 'Event A', dateStart: '2024-06-15T20:00:00Z', venueName: 'Venue 2' }), // different venue
    ];
    const result = deduplicateEvents(events);
    expect(result).toHaveLength(4);
    expect(result.map(e => e.id)).toEqual([1, 2, 4, 5]);
  });
});
