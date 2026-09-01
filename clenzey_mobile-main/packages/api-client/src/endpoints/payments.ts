import { AxiosInstance } from 'axios';
import { PaymentOrder, PaymentConfirmation } from '@clenzey/types';

/**
 * Response from the payment confirmation endpoint.
 */
export interface PaymentConfirmResponse {
  success: boolean;
}

/**
 * Creates the payments endpoint module.
 *
 * Provides typed methods for Razorpay payment processing:
 * - createOrder: Create a Razorpay order for a booking
 * - confirm: Confirm a completed Razorpay payment with signature verification
 */
export function createPaymentsEndpoints(client: AxiosInstance) {
  return {
    /** POST /api/v1/payments/orders — Create a Razorpay order for a booking */
    createOrder: (bookingId: string) =>
      client.post<PaymentOrder>('/api/v1/payments/orders', { bookingId }),

    /** POST /api/v1/payments/confirm — Confirm a Razorpay payment */
    confirm: (data: PaymentConfirmation) =>
      client.post<PaymentConfirmResponse>('/api/v1/payments/confirm', data),
  };
}
