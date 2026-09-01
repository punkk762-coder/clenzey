import { describe, it, expect, vi } from 'vitest';
import { createPartnerAuthEndpoints } from './partner-auth';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    post: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createPartnerAuthEndpoints', () => {
  describe('initiate', () => {
    it('should call POST /api/v1/partners/auth/initiate with phone', async () => {
      const client = createMockClient();
      const endpoints = createPartnerAuthEndpoints(client);

      await endpoints.initiate('+919876543210');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/partners/auth/initiate',
        { phone: '+919876543210' }
      );
    });
  });

  describe('validate', () => {
    it('should call POST /api/v1/partners/auth/validate with token and secret', async () => {
      const client = createMockClient();
      const endpoints = createPartnerAuthEndpoints(client);

      await endpoints.validate('token-abc', '123456');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/partners/auth/validate',
        { token: 'token-abc', secret: '123456' }
      );
    });

    it('should include fullName when provided for new partner registration', async () => {
      const client = createMockClient();
      const endpoints = createPartnerAuthEndpoints(client);

      await endpoints.validate('token-abc', '123456', 'John Doe');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/partners/auth/validate',
        { token: 'token-abc', secret: '123456', fullName: 'John Doe' }
      );
    });

    it('should not include fullName key when not provided', async () => {
      const client = createMockClient();
      const endpoints = createPartnerAuthEndpoints(client);

      await endpoints.validate('token-abc', '123456');

      const callArgs = (client.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('fullName');
    });
  });

  describe('refresh', () => {
    it('should call POST /api/v1/partners/auth/refresh with withCredentials', async () => {
      const client = createMockClient();
      const endpoints = createPartnerAuthEndpoints(client);

      await endpoints.refresh();

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/partners/auth/refresh',
        {},
        { withCredentials: true }
      );
    });
  });

  describe('logout', () => {
    it('should call POST /api/v1/partners/auth/logout', async () => {
      const client = createMockClient();
      const endpoints = createPartnerAuthEndpoints(client);

      await endpoints.logout();

      expect(client.post).toHaveBeenCalledWith('/api/v1/partners/auth/logout');
    });
  });
});
