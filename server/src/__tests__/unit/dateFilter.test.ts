import { describe, it, expect } from 'vitest';
import { filterByDate } from '../../utils/dateFilter.js';

function makeEvent(overrides: { dateStart: string; dateEnd?: string }) {
  return {
    id: 1,
    name: 'Test Event',
    dateStart: overrides.dateStart,
    dateEnd: overrides.dateEnd,
    venueName: 'Test Venue',
    lat: 45.0,
    lng: 9.0,
    category: 'musica' as const,
    sourceUrl: 'http://example.com',
    sourceId: 1,
    scrapedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('filterByDate', () => {
  const now = new Date('2024-06-15T14:00:00.000Z');

  it('includes a future event within 30 days', () => {
    const event = makeEvent({ dateStart: '2024-06-20T20:00:00.000Z' });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(1);
  });

  it('includes an event starting exactly at the 30-day boundary', () => {
    // 30 days from now = 2024-07-15T14:00:00.000Z
    const event = makeEvent({ dateStart: '2024-07-15T14:00:00.000Z' });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(1);
  });

  it('excludes an event more than 30 days in the future', () => {
    const event = makeEvent({ dateStart: '2024-07-16T00:00:00.000Z' });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(0);
  });

  it('includes an ongoing event (start in past, end in future)', () => {
    const event = makeEvent({
      dateStart: '2024-06-14T10:00:00.000Z',
      dateEnd: '2024-06-16T22:00:00.000Z',
    });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(1);
  });

  it('excludes a past event (start and end both in the past)', () => {
    const event = makeEvent({
      dateStart: '2024-06-10T10:00:00.000Z',
      dateEnd: '2024-06-12T22:00:00.000Z',
    });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(0);
  });

  it('includes an event with no end date that started today', () => {
    const event = makeEvent({ dateStart: '2024-06-15T10:00:00.000Z' });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(1);
  });

  it('excludes an event with no end date that started yesterday', () => {
    const event = makeEvent({ dateStart: '2024-06-14T10:00:00.000Z' });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(0);
  });

  it('excludes an event with end date exactly at now', () => {
    const event = makeEvent({
      dateStart: '2024-06-14T10:00:00.000Z',
      dateEnd: '2024-06-15T14:00:00.000Z',
    });
    const result = filterByDate([event], now);
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when given an empty array', () => {
    const result = filterByDate([], now);
    expect(result).toHaveLength(0);
  });

  it('filters correctly with a mix of events', () => {
    const events = [
      makeEvent({ dateStart: '2024-06-20T20:00:00.000Z' }),                          // future within 30d ✓
      makeEvent({ dateStart: '2024-08-01T20:00:00.000Z' }),                          // too far ✗
      makeEvent({ dateStart: '2024-06-01T10:00:00.000Z', dateEnd: '2024-06-10T22:00:00.000Z' }), // past ✗
      makeEvent({ dateStart: '2024-06-14T10:00:00.000Z', dateEnd: '2024-06-16T22:00:00.000Z' }), // ongoing ✓
      makeEvent({ dateStart: '2024-06-15T08:00:00.000Z' }),                          // today no end ✓
    ];
    const result = filterByDate(events, now);
    expect(result).toHaveLength(3);
  });
});
