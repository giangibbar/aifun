import { describe, it, expect } from 'vitest';
import { toRad, haversineDistanceKm, filterByDistance } from '../../utils/geo.js';

describe('toRad', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(toRad(0)).toBe(0);
  });

  it('converts 180 degrees to PI radians', () => {
    expect(toRad(180)).toBeCloseTo(Math.PI);
  });

  it('converts 90 degrees to PI/2 radians', () => {
    expect(toRad(90)).toBeCloseTo(Math.PI / 2);
  });

  it('converts negative degrees correctly', () => {
    expect(toRad(-90)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('haversineDistanceKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistanceKm(45.0, 9.0, 45.0, 9.0)).toBe(0);
  });

  it('calculates distance between Rome and Milan (~477 km)', () => {
    // Rome: 41.9028, 12.4964
    // Milan: 45.4642, 9.1900
    const distance = haversineDistanceKm(41.9028, 12.4964, 45.4642, 9.19);
    expect(distance).toBeGreaterThan(470);
    expect(distance).toBeLessThan(485);
  });

  it('calculates distance between two nearby points (~1 km)', () => {
    // Approximately 1 km apart at equator (0.009 degrees latitude ≈ 1 km)
    const distance = haversineDistanceKm(0, 0, 0.009, 0);
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.1);
  });

  it('is symmetric (distance A→B equals B→A)', () => {
    const d1 = haversineDistanceKm(41.9028, 12.4964, 45.4642, 9.19);
    const d2 = haversineDistanceKm(45.4642, 9.19, 41.9028, 12.4964);
    expect(d1).toBeCloseTo(d2);
  });

  it('handles antipodal points (max distance ~20015 km)', () => {
    // North pole to south pole
    const distance = haversineDistanceKm(90, 0, -90, 0);
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20020);
  });
});

describe('filterByDistance', () => {
  const events = [
    { id: 1, name: 'Near event', lat: 45.465, lng: 9.19 },
    { id: 2, name: 'Far event', lat: 41.9, lng: 12.5 },
    { id: 3, name: 'Medium event', lat: 45.0, lng: 9.5 },
  ];

  const centerLat = 45.464;
  const centerLng = 9.19;

  it('returns only events within the given radius', () => {
    // 5 km radius - only the very near event should be included
    const result = filterByDistance(events, centerLat, centerLng, 5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns all events when radius is large enough', () => {
    // 600 km radius - all events should be included
    const result = filterByDistance(events, centerLat, centerLng, 600);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no events are within radius', () => {
    const result = filterByDistance(events, centerLat, centerLng, 0.001);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const result = filterByDistance([], centerLat, centerLng, 100);
    expect(result).toHaveLength(0);
  });

  it('includes events exactly at the boundary', () => {
    // Calculate exact distance to event 1
    const exactDistance = haversineDistanceKm(centerLat, centerLng, 45.465, 9.19);
    const result = filterByDistance(events, centerLat, centerLng, exactDistance);
    expect(result.some((e) => e.id === 1)).toBe(true);
  });
});
