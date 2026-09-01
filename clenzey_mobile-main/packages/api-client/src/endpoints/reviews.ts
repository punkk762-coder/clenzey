import { AxiosInstance } from 'axios';
import { Review } from '@clenzey/types';

/**
 * Payload for creating a review.
 */
export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  review?: string;
}

/**
 * Response from listing reviews for a partner.
 */
export interface ListReviewsResponse {
  reviews: Review[];
  total: number;
  averageRating: number;
}

/**
 * Params for paginated review listing.
 */
export interface ListReviewsParams {
  limit?: number;
  offset?: number;
}

/**
 * Creates the reviews endpoint module.
 *
 * Provides typed methods for managing reviews:
 * - create: Submit a review for a completed booking
 * - listByPartner: Fetch paginated reviews for a specific partner
 */
export function createReviewsEndpoints(client: AxiosInstance) {
  return {
    /** POST /api/v1/reviews — Create a review */
    create: (data: CreateReviewPayload) =>
      client.post<Review>('/api/v1/reviews', data),

    /** GET /api/v1/reviews/partner/:partnerId — List reviews for a partner */
    listByPartner: (partnerId: string, params?: ListReviewsParams) =>
      client.get<ListReviewsResponse>(
        `/api/v1/reviews/partner/${partnerId}`,
        { params }
      ),
  };
}
