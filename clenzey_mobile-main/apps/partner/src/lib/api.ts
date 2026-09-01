import { createApiClient, createNotificationsEndpoints, createContactEndpoints, createReviewsEndpoints } from '@clenzey/api-client';
import { getToken, useAuthStore } from '../store/auth';
import { router } from 'expo-router';

/**
 * Response shape for partner auth endpoints (signin/signup).
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
    approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  };
}

/**
 * Configured API client instance for the Partner app.
 *
 * - getToken: retrieves access token from expo-secure-store
 * - setToken: persists new token via auth store
 * - onAuthFailure: triggers logout and navigates to login
 * - refreshEndpoint: partner-specific refresh endpoint
 */
export const apiClient = createApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.clenzey.com',
  getToken,
  setToken: async (token: string) => {
    useAuthStore.getState().setToken(token);
  },
  onAuthFailure: () => {
    useAuthStore.getState().logout();
    router.replace('/(auth)/login');
  },
  refreshEndpoint: '/api/v1/partners/auth/refresh',
});

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
 * Sign in with email/phone and password.
 */
export async function partnerSignIn(identifier: string, password: string): Promise<AuthResponse> {
  const result = (await apiClient.post('/api/v1/partners/auth/signin', { identifier, password })) as any;
  const approvalStatus = result?.user?.approvalStatus ?? result?.approvalStatus ?? 'APPROVED';
  return {
    ...result,
    user: {
      ...result?.user,
      approvalStatus,
    },
  };
}

/**
 * Sign up a new partner account.
 */
export async function partnerSignUp(data: { email: string; fullName: string; password: string; phone: string }): Promise<AuthResponse> {
  const result = (await apiClient.post('/api/v1/partners/auth/signup', data)) as any;
  const approvalStatus = result?.user?.approvalStatus ?? result?.approvalStatus ?? 'PENDING';
  return {
    ...result,
    user: {
      ...result?.user,
      approvalStatus,
    },
  };
}
