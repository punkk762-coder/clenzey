import { describe, it, expect, vi } from 'vitest';

import { createAddressesEndpoints } from './addresses';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createAddressesEndpoints', () => {
  describe('list', () => {
    it('should call GET /api/v1/addresses', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      await endpoints.list();

      expect(client.get).toHaveBeenCalledWith('/api/v1/addresses');
    });
  });

  describe('create', () => {
    it('should call POST /api/v1/addresses with payload', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      const payload = {
        label: 'Home',
        addressType: 'HOME' as const,
        line1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };

      await endpoints.create(payload);

      expect(client.post).toHaveBeenCalledWith('/api/v1/addresses', payload);
    });

    it('should include optional fields when provided', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      const payload = {
        label: 'Office',
        addressType: 'WORK' as const,
        line1: '456 Business Park',
        line2: 'Floor 5',
        landmark: 'Near Metro Station',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      await endpoints.create(payload);

      expect(client.post).toHaveBeenCalledWith('/api/v1/addresses', payload);
    });
  });

  describe('get', () => {
    it('should call GET /api/v1/addresses/:addressId', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      await endpoints.get('addr-123');

      expect(client.get).toHaveBeenCalledWith('/api/v1/addresses/addr-123');
    });
  });

  describe('update', () => {
    it('should call PATCH /api/v1/addresses/:addressId with partial payload', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      const payload = { label: 'Updated Home', city: 'Delhi' };

      await endpoints.update('addr-123', payload);

      expect(client.patch).toHaveBeenCalledWith('/api/v1/addresses/addr-123', payload);
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/v1/addresses/:addressId', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      await endpoints.delete('addr-123');

      expect(client.delete).toHaveBeenCalledWith('/api/v1/addresses/addr-123');
    });
  });

  describe('setDefault', () => {
    it('should call POST /api/v1/addresses/:addressId/default', async () => {
      const client = createMockClient();
      const endpoints = createAddressesEndpoints(client);

      await endpoints.setDefault('addr-123');

      expect(client.post).toHaveBeenCalledWith('/api/v1/addresses/addr-123/default');
    });
  });
});
