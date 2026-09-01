import { createApiClient, createConsumerAuthEndpoints, createConsumersEndpoints, createLocationEndpoints, createServicesEndpoints, createBookingsEndpoints, createPaymentsEndpoints, createCouponsEndpoints, createEtaEndpoints, createNotificationsEndpoints, createContactEndpoints, createReviewsEndpoints, createQuotationsEndpoints, createDisputesEndpoints, createReferralsEndpoints } from '@clenzey/api-client';
import { getToken, useAuthStore } from '../store/auth';

/**
 * Response shape for email/password signin and signup endpoints.
 */
export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Configured Axios instance for the consumer app.
 * Uses expo-secure-store for token persistence and the auth store's getToken helper.
 */
export const apiClient = createApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.clenzey.com',
  getToken,
  setToken: async (token: string) => {
    // Update both persistent storage and in-memory Zustand state
    useAuthStore.getState().setToken(token);
  },
  onAuthFailure: () => {
    // Trigger logout when refresh fails (e.g., refresh token expired)
    useAuthStore.getState().logout();
  },
  refreshEndpoint: '/api/v1/consumers/auth/refresh',
});

/**
 * Consumer auth API endpoints.
 */
export const consumerAuthApi = createConsumerAuthEndpoints(apiClient);

/**
 * Consumer profile API endpoints (GET/PATCH /consumers/me).
 */
export const consumersApi = createConsumersEndpoints(apiClient);

/**
 * Location API endpoints (reverse-geocode, places search, places details, serviceability).
 */
export const locationApi = createLocationEndpoints(apiClient);

/**
 * Services API endpoints (list, getById, estimate).
 */
export const servicesApi = createServicesEndpoints(apiClient);

/**
 * Bookings API endpoints (create, preview, list, getById, cancel, transition, reschedule).
 */
export const bookingsApi = createBookingsEndpoints(apiClient);

/**
 * Payments API endpoints (createOrder, confirm).
 */
export const paymentsApi = createPaymentsEndpoints(apiClient);

/**
 * Coupons API endpoints (listOffers, validate).
 */
export const couponsApi = createCouponsEndpoints(apiClient);

/**
 * ETA API endpoints (GET /bookings/:id/eta).
 */
export const etaApi = createEtaEndpoints(apiClient);

/**
 * Notifications API endpoints (registerToken, removeToken, list, markRead, markAllRead).
 */
export const notificationsApi = createNotificationsEndpoints(apiClient);

/**
 * Contact API endpoints (getPartnerContact, getConsumerContact).
 */
export const contactApi = createContactEndpoints(apiClient);

/**
 * Reviews API endpoints (create, listByPartner).
 */
export const reviewsApi = createReviewsEndpoints(apiClient);

/**
 * Quotations API endpoints (create, list, accept, delete).
 */
export const quotationsApi = createQuotationsEndpoints(apiClient);

/**
 * Disputes API endpoints (create, list, getByBooking, getById).
 */
export const disputesApi = createDisputesEndpoints(apiClient);

/**
 * Referrals API endpoints (getMe, apply).
 */
export const referralsApi = createReferralsEndpoints(apiClient);

/**
 * Sign in a consumer using email/phone and password.
 */
export async function consumerSignIn(identifier: string, password: string): Promise<AuthResponse> {
  const result = await apiClient.post('/api/v1/consumers/auth/signin', { identifier, password });
  return result as unknown as AuthResponse;
}

/**
 * Sign up a new consumer with email, password, and phone.
 */
export async function consumerSignUp(data: {
  email: string;
  password: string;
  phone: string;
  referralCode?: string;
}): Promise<AuthResponse> {
  const result = await apiClient.post('/api/v1/consumers/auth/signup', data);
  return result as unknown as AuthResponse;
}
