import { AxiosInstance } from 'axios';

/**
 * Response containing a phone number for contact.
 */
export interface ContactResponse {
  phone: string;
}

/**
 * Creates the contact endpoint module.
 *
 * Provides typed methods for retrieving contact information during bookings:
 * - getPartnerContact: Get the assigned partner's phone number
 * - getConsumerContact: Get the consumer's phone number (for partners)
 */
export function createContactEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/bookings/:bookingId/contact/partner — Get partner phone */
    getPartnerContact: (bookingId: string) =>
      client.get<ContactResponse>(
        `/api/v1/bookings/${bookingId}/contact/partner`
      ),

    /** GET /api/v1/bookings/:bookingId/contact/consumer — Get consumer phone */
    getConsumerContact: (bookingId: string) =>
      client.get<ContactResponse>(
        `/api/v1/bookings/${bookingId}/contact/consumer`
      ),
  };
}
