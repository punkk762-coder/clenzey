import { describe, it, expect, vi } from 'vitest';

import { createReferralsEndpoints } from './referrals';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createReferralsEndpoints', () => {
  describe('getMe', () => {
    it('should call GET /api/v1/referrals/me', async () => {
      const client = createMockClient();
      const endpoints = createReferralsEndpoints(client);

      await endpoints.getMe();

      expect(client.get).toHaveBeenCalledWith('/api/v1/referrals/me');
    });
  });

  describe('apply', () => {
    it('should call POST /api/v1/referrals/apply with referral code', async () => {
      const client = createMockClient();
      const endpoints = createReferralsEndpoints(client);

      await endpoints.apply({ referralCode: 'CLNZ7E888C' });

      expect(client.post).toHaveBeenCalledWith('/api/v1/referrals/apply', {
        referralCode: 'CLNZ7E888C',
      });
    });
  });
});
