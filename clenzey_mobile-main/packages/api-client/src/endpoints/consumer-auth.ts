import type { AxiosInstance } from 'axios';
import type {
  InitiateResponse,
  ValidateResponse,
  RefreshResponse,
  Consumer,
} from '@clenzey/types';

/**
 * Consumer-specific validate response includes isNewUser flag.
 */
export interface ConsumerValidateResponse {
  accessToken: string;
  isNewUser?: boolean;
  user: Consumer;
}

/**
 * Creates consumer authentication endpoint functions bound to the given Axios instance.
 *
 * Endpoints:
 * - initiate: Start OTP flow with phone number
 * - validate: Verify OTP and get access token
 * - refresh: Refresh access token using HttpOnly cookie
 * - logout: Invalidate session
 */
export function createConsumerAuthEndpoints(client: AxiosInstance) {
  return {
    /**
     * Initiates consumer authentication by sending an OTP to the provided phone number.
     * @param phone - E.164 formatted phone number (e.g., +919876543210)
     */
    initiate: (phone: string) =>
      client.post<InitiateResponse>('/api/v1/consumers/auth/initiate', { phone }),

    /**
     * Validates the OTP and returns access token + user data.
     * @param token - Token received from initiate response
     * @param secret - OTP entered by the user
     * @param referralCode - Optional referral code for new users (ignored on returning login)
     */
    validate: (token: string, secret: string, referralCode?: string) =>
      client.post<ConsumerValidateResponse>('/api/v1/consumers/auth/validate', {
        token,
        secret,
        ...(referralCode ? { referralCode } : {}),
      }),

    /**
     * Refreshes the access token using the HttpOnly refresh cookie.
     * The cookie is sent automatically via withCredentials.
     */
    refresh: () =>
      client.post<RefreshResponse>(
        '/api/v1/consumers/auth/refresh',
        {},
        { withCredentials: true }
      ),

    /**
     * Logs out the consumer, invalidating the current session.
     */
    logout: () => client.post('/api/v1/consumers/auth/logout'),
  };
}
