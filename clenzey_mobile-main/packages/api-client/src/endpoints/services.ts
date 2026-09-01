import { AxiosInstance } from 'axios';
import { Service } from '@clenzey/types';

/**
 * Payload for requesting a price estimate for a service.
 */
export interface EstimatePayload {
  variantId: string;
  subVariantId?: string;
  addonIds?: string[];
}

/**
 * Response from the price estimate endpoint.
 */
export interface EstimateResponse {
  totalAmount: number;
  breakdown: Record<string, number>;
}

/**
 * Creates the services endpoint module.
 *
 * Provides typed methods for browsing services:
 * - list: Fetch all available services
 * - getById: Fetch a single service by ID
 * - estimate: Get a price estimate for a service configuration
 */
export function createServicesEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/services — List all available services */
    list: () => client.get<Service[]>('/api/v1/services'),

    /** GET /api/v1/services/:serviceId — Get a single service by ID */
    getById: (serviceId: string) =>
      client.get<Service>(`/api/v1/services/${serviceId}`),

    /** POST /api/v1/services/:serviceId/estimate — Get price estimate */
    estimate: (serviceId: string, data: EstimatePayload) =>
      client.post<EstimateResponse>(
        `/api/v1/services/${serviceId}/estimate`,
        data
      ),
  };
}
