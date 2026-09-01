import { describe, it, expect, vi } from 'vitest';

import { createCouponsEndpoints } from './coupons';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createCouponsEndpoints', () => {
  describe('listOffers', () => {
    it('should call GET /api/v1/coupons/offers without params', async () => {
      const client = createMockClient();
      const endpoints = createCouponsEndpoints(client);

      await endpoints.listOffers();

      expect(client.get).toHaveBeenCalledWith('/api/v1/coupons/offers', {
        params: undefined,
      });
    });

    it('should pass limit query param when provided', async () => {
      const client = createMockClient();
      const endpoints = createCouponsEndpoints(client);

      await endpoints.listOffers({ limit: 5 });

      expect(client.get).toHaveBeenCalledWith('/api/v1/coupons/offers', {
        params: { limit: 5 },
      });
    });
  });

  describe('validate', () => {
    it('should call POST /api/v1/coupons/validate with required fields', async () => {
      const client = createMockClient();
      const endpoints = createCouponsEndpoints(client);

      const payload = {
        code: 'SUMMER20',
        amount: 500,
      };

      await endpoints.validate(payload);

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/coupons/validate',
        payload
      );
    });

    it('should include optional serviceId and serviceCategory', async () => {
      const client = createMockClient();
      const endpoints = createCouponsEndpoints(client);

      const payload = {
        code: 'DEEP10',
        amount: 1200,
        serviceId: 'service-456',
        serviceCategory: 'DEEP_CLEANING',
      };

      await endpoints.validate(payload);

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/coupons/validate',
        payload
      );
    });
  });
});
