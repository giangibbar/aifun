/**
 * Geographic utility functions for distance calculation and filtering.
 * Uses the Haversine formula for great-circle distance between two points.
 */

/**
 * Converts degrees to radians.
 */
export function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two geographic points
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 in degrees
 * @param lng1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lng2 - Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filters an array of events by distance from a center point.
 * Returns only events whose Haversine distance from (centerLat, centerLng)
 * is less than or equal to the given radius in kilometers.
 *
 * @param events - Array of events with lat/lng coordinates
 * @param centerLat - Latitude of the center point (user position)
 * @param centerLng - Longitude of the center point (user position)
 * @param radiusKm - Maximum distance in kilometers (inclusive)
 * @returns Filtered array of events within the radius
 */
export function filterByDistance<T extends { lat: number; lng: number }>(
  events: T[],
  centerLat: number,
  centerLng: number,
  radiusKm: number
): T[] {
  return events.filter((event) => {
    const distance = haversineDistanceKm(
      centerLat,
      centerLng,
      event.lat,
      event.lng
    );
    return distance <= radiusKm;
  });
}
