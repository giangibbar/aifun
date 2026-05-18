import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeocodingService } from '../../services/GeocodingService.js';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('geocode', () => {
    it('should return coordinates for a valid address', async () => {
      const mockResponse = [
        { lat: '41.9027835', lon: '12.4963655', display_name: 'Roma, Italia' }
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }));

      const result = await service.geocode('Roma, Italia');

      expect(result).toEqual({ lat: 41.9027835, lng: 12.4963655 });
    });

    it('should return null when address is not found', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }));

      const result = await service.geocode('xyznonexistentaddress123');

      expect(result).toBeNull();
    });

    it('should return null for empty address', async () => {
      const result = await service.geocode('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only address', async () => {
      const result = await service.geocode('   ');
      expect(result).toBeNull();
    });

    it('should throw on timeout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
      }));

      const geocodePromise = service.geocode('Roma, Italia');
      vi.advanceTimersByTime(5000);

      await expect(geocodePromise).rejects.toThrow('Geocoding request timed out. Please try again.');
    });

    it('should throw on service unavailable (503)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }));

      await expect(service.geocode('Roma')).rejects.toThrow(
        'Geocoding service is temporarily unavailable. Please try again later.'
      );
    });

    it('should throw on bad gateway (502)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      }));

      await expect(service.geocode('Roma')).rejects.toThrow(
        'Geocoding service is temporarily unavailable. Please try again later.'
      );
    });

    it('should throw on gateway timeout (504)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
      }));

      await expect(service.geocode('Roma')).rejects.toThrow(
        'Geocoding service is temporarily unavailable. Please try again later.'
      );
    });

    it('should throw descriptive error for other HTTP errors', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }));

      await expect(service.geocode('Roma')).rejects.toThrow(
        'Geocoding request failed with status 429'
      );
    });

    it('should send correct query parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ lat: '41.9', lon: '12.5', display_name: 'Roma' }]),
      });
      vi.stubGlobal('fetch', mockFetch);

      await service.geocode('Via Roma 1, Milano');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('q')).toBe('Via Roma 1, Milano');
      expect(calledUrl.searchParams.get('format')).toBe('json');
      expect(calledUrl.searchParams.get('limit')).toBe('1');
    });

    it('should include User-Agent header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal('fetch', mockFetch);

      await service.geocode('Roma');

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers['User-Agent']).toContain('LocalEventsFinder');
    });

    it('should return null when response contains invalid coordinates', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ lat: 'invalid', lon: 'invalid', display_name: 'Test' }]),
      }));

      const result = await service.geocode('Test');
      expect(result).toBeNull();
    });
  });
});
