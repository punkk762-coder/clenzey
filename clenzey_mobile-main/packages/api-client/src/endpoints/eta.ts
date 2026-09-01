import { AxiosInstance } from 'axios';

/**
 * Response containing estimated time of arrival.
 */
export interface EtaResponse {
  etaMinutes: number;
}

/**
 * Creates the ETA endpoint module.
 *
 * Provides a typed method for fetching partner ETA for a booking:
 * - getEta: Get estimated arrival time for the assigned partner
 */
export function createEtaEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/bookings/:bookingId/eta — Get partner ETA */
    getEta: (bookingId: string) =>
      client.get<EtaResponse>(`/api/v1/bookings/${bookingId}/eta`),
  };
}
