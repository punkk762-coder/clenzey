import { AxiosInstance } from 'axios';
import { Quotation } from '@clenzey/types';

/**
 * Payload for creating a quotation request.
 */
export interface CreateQuotationPayload {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  preferredTime?: string;
  serviceId?: string;
  variantId?: string;
}

/**
 * Creates the quotations endpoint module.
 *
 * Provides typed methods for managing quotation requests:
 * - create: Submit a new quotation request
 * - list: Fetch all quotations for the current consumer
 * - accept: Accept a quotation
 * - delete: Delete/cancel a quotation
 */
export function createQuotationsEndpoints(client: AxiosInstance) {
  return {
    /** POST /api/v1/quotations — Create a quotation request */
    create: (data: CreateQuotationPayload) =>
      client.post<Quotation>('/api/v1/quotations', data),

    /** GET /api/v1/quotations — List all quotations */
    list: () => client.get<Quotation[]>('/api/v1/quotations'),

    /** POST /api/v1/quotations/:id/accept — Accept a quotation */
    accept: (id: string) =>
      client.post<Quotation>(`/api/v1/quotations/${id}/accept`),

    /** DELETE /api/v1/quotations/:id — Delete a quotation */
    delete: (id: string) =>
      client.delete<void>(`/api/v1/quotations/${id}`),
  };
}
