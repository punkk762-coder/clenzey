import { describe, it, expect, vi } from 'vitest';
import { createConsumerAuthEndpoints } from './consumer-auth';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    post: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createConsumerAuthEndpoints', () => {
  describe('initiate', () => {
    it('should call POST /api/v1/consumers/auth/initiate with phone', async () => {
      const client = createMockClient();
      const endpoints = createConsumerAuthEndpoints(client);

      await endpoints.initiate('+919876543210');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/consumers/auth/initiate',
        { phone: '+919876543210' }
      );
    });
  });

  describe('validate', () => {
    it('should call POST /api/v1/consumers/auth/validate with token and secret', async () => {
      const client = createMockClient();
      const endpoints = createConsumerAuthEndpoints(client);

      await endpoints.validate('token-123', '654321');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/consumers/auth/validate',
        { token: 'token-123', secret: '654321' }
      );
    });

    it('should include referralCode when provided', async () => {
      const client = createMockClient();
      const endpoints = createConsumerAuthEndpoints(client);

      await endpoints.validate('token-123', '654321', 'CLNZ7E888C');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/consumers/auth/validate',
        { token: 'token-123', secret: '654321', referralCode: 'CLNZ7E888C' }
      );
    });
  });

  describe('refresh', () => {
    it('should call POST /api/v1/consumers/auth/refresh with withCredentials', async () => {
      const client = createMockClient();
      const endpoints = createConsumerAuthEndpoints(client);

      await endpoints.refresh();

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/consumers/auth/refresh',
        {},
        { withCredentials: true }
      );
    });
  });

  describe('logout', () => {
    it('should call POST /api/v1/consumers/auth/logout', async () => {
      const client = createMockClient();
      const endpoints = createConsumerAuthEndpoints(client);

      await endpoints.logout();

      expect(client.post).toHaveBeenCalledWith('/api/v1/consumers/auth/logout');
    });
  });
});
