import { describe, it, expect, vi } from 'vitest';

import { createLocationEndpoints } from './location';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createLocationEndpoints', () => {
  describe('reverseGeocode', () => {
    it('should call GET /api/v1/location/reverse-geocode with lat/lng params', async () => {
      const client = createMockClient();
      const endpoints = createLocationEndpoints(client);

      await endpoints.reverseGeocode(19.076, 72.8777);

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/location/reverse-geocode',
        { params: { latitude: 19.076, longitude: 72.8777 } }
      );
    });
  });

  describe('placesSearch', () => {
    it('should call GET /api/v1/location/places/search with query param', async () => {
      const client = createMockClient();
      const endpoints = createLocationEndpoints(client);

      await endpoints.placesSearch('Marine Drive Mumbai');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/location/places/search',
        { params: { query: 'Marine Drive Mumbai' } }
      );
    });
  });

  describe('placesDetails', () => {
    it('should call GET /api/v1/location/places/details with placeId param', async () => {
      const client = createMockClient();
      const endpoints = createLocationEndpoints(client);

      await endpoints.placesDetails('ChIJwe1EZjDG5zsRaYxkjY_tpF0');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/location/places/details',
        { params: { placeId: 'ChIJwe1EZjDG5zsRaYxkjY_tpF0' } }
      );
    });
  });

  describe('serviceability', () => {
    it('should call GET /api/v1/location/serviceability with lat/lng params', async () => {
      const client = createMockClient();
      const endpoints = createLocationEndpoints(client);

      await endpoints.serviceability(12.9716, 77.5946);

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/location/serviceability',
        { params: { latitude: 12.9716, longitude: 77.5946 } }
      );
    });
  });
});
