/**
 * GeocodingService — Converts addresses to geographic coordinates using the Nominatim API.
 *
 * Integrates with OpenStreetMap's Nominatim geocoding service.
 * Implements a 5-second timeout and handles common error scenarios.
 *
 * Requirements: 1.5, 1.6
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const GEOCODING_TIMEOUT_MS = 5000;
const USER_AGENT = 'LocalEventsFinder/1.0 (https://github.com/local-events-finder)';

export interface GeocodingResult {
  lat: number;
  lng: number;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

export class GeocodingService {
  /**
   * Geocodes an address string into geographic coordinates.
   *
   * @param address - The address or place name to geocode
   * @returns Coordinates { lat, lng } or null if the address was not found
   * @throws Error with descriptive message for timeout or service unavailable
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    const trimmed = address.trim();
    if (!trimmed) {
      return null;
    }

    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 503 || response.status === 502 || response.status === 504) {
          throw new Error('Geocoding service is temporarily unavailable. Please try again later.');
        }
        throw new Error(`Geocoding request failed with status ${response.status}`);
      }

      const results = await response.json() as NominatimResponse[];

      if (!results || results.length === 0) {
        return null;
      }

      const first = results[0];
      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);

      if (isNaN(lat) || isNaN(lng)) {
        return null;
      }

      return { lat, lng };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Geocoding request timed out. Please try again.');
        }
        // Re-throw our own descriptive errors
        throw error;
      }
      throw new Error('An unexpected error occurred during geocoding.');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const geocodingService = new GeocodingService();
