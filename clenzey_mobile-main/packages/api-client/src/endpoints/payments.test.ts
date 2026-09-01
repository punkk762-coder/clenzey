import { describe, it, expect, vi } from 'vitest';

import { createPaymentsEndpoints } from './payments';
import type { AxiosInstance } from 'axios';

function createMockClient(): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  } as unknown as AxiosInstance;
}

describe('createPaymentsEndpoints', () => {
  describe('createOrder', () => {
    it('should call POST /api/v1/payments/orders with bookingId', async () => {
      const client = createMockClient();
      const endpoints = createPaymentsEndpoints(client);

      await endpoints.createOrder('booking-123');

      expect(client.post).toHaveBeenCalledWith('/api/v1/payments/orders', {
        bookingId: 'booking-123',
      });
    });
  });

  describe('confirm', () => {
    it('should call POST /api/v1/payments/confirm with payment confirmation data', async () => {
      const client = createMockClient();
      const endpoints = createPaymentsEndpoints(client);

      const confirmationData = {
        razorpayOrderId: 'order_abc123',
        razorpayPaymentId: 'pay_xyz789',
        razorpaySignature: 'sig_def456',
      };

      await endpoints.confirm(confirmationData);

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/payments/confirm',
        confirmationData
      );
    });
  });
});
