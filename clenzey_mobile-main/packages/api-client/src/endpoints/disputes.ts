import { AxiosInstance } from 'axios';
import type {
  BookingDisputeStatus,
  CreateDisputePayload,
  Dispute,
  ListDisputesParams,
  ListDisputesResponse,
} from '@clenzey/types';

/**
 * Creates the disputes endpoint module.
 *
 * Provides typed methods for managing booking disputes:
 * - create: Raise a dispute for a booking
 * - list: List the authenticated consumer's disputes
 * - getByBooking: Get dispute status for a specific booking
 * - getById: Get full dispute details by ID
 */
export function createDisputesEndpoints(client: AxiosInstance) {
  return {
    /** POST /api/v1/disputes — Create a dispute for a booking */
    create: (data: CreateDisputePayload) =>
      client.post<{ dispute: Dispute }>('/api/v1/disputes', data),

    /** GET /api/v1/disputes — List own disputes */
    list: (params?: ListDisputesParams) =>
      client.get<ListDisputesResponse>('/api/v1/disputes', { params }),

    /** GET /api/v1/disputes/booking/:bookingId — Get dispute status for a booking */
    getByBooking: (bookingId: string) =>
      client.get<{ disputeStatus: BookingDisputeStatus }>(
        `/api/v1/disputes/booking/${bookingId}`,
      ),

    /** GET /api/v1/disputes/:id — Get a dispute by ID */
    getById: (id: string) =>
      client.get<{ dispute: Dispute }>(`/api/v1/disputes/${id}`),
  };
}
