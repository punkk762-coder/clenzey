import { describe, it, expect, vi } from 'vitest';

import { createDisputesEndpoints } from './disputes';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createDisputesEndpoints', () => {
  describe('create', () => {
    it('should call POST /api/v1/disputes with payload', async () => {
      const client = createMockClient();
      const endpoints = createDisputesEndpoints(client);

      const payload = {
        bookingId: 'booking-1',
        category: 'SERVICE_QUALITY' as const,
        description: 'The bathroom was not cleaned properly.',
      };

      await endpoints.create(payload);

      expect(client.post).toHaveBeenCalledWith('/api/v1/disputes', payload);
    });
  });

  describe('list', () => {
    it('should call GET /api/v1/disputes without params', async () => {
      const client = createMockClient();
      const endpoints = createDisputesEndpoints(client);

      await endpoints.list();

      expect(client.get).toHaveBeenCalledWith('/api/v1/disputes', { params: undefined });
    });

    it('should call GET /api/v1/disputes with query params', async () => {
      const client = createMockClient();
      const endpoints = createDisputesEndpoints(client);

      const params = { status: 'OPEN' as const, limit: 20, offset: 0 };
      await endpoints.list(params);

      expect(client.get).toHaveBeenCalledWith('/api/v1/disputes', { params });
    });
  });

  describe('getByBooking', () => {
    it('should call GET /api/v1/disputes/booking/:bookingId', async () => {
      const client = createMockClient();
      const endpoints = createDisputesEndpoints(client);

      await endpoints.getByBooking('booking-1');

      expect(client.get).toHaveBeenCalledWith('/api/v1/disputes/booking/booking-1');
    });
  });

  describe('getById', () => {
    it('should call GET /api/v1/disputes/:id', async () => {
      const client = createMockClient();
      const endpoints = createDisputesEndpoints(client);

      await endpoints.getById('dispute-1');

      expect(client.get).toHaveBeenCalledWith('/api/v1/disputes/dispute-1');
    });
  });
});
