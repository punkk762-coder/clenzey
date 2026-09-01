import type { AxiosInstance } from 'axios';
import type {
  InitiateResponse,
  RefreshResponse,
  Partner,
  ApprovalStatus,
} from '@clenzey/types';

/**
 * Partner-specific validate response includes approvalStatus.
 */
export interface PartnerValidateResponse {
  accessToken: string;
  approvalStatus: ApprovalStatus;
  user: Partner;
}

/**
 * Creates partner authentication endpoint functions bound to the given Axios instance.
 *
 * Endpoints:
 * - initiate: Start OTP flow with phone number
 * - validate: Verify OTP (with optional fullName for new partners)
 * - refresh: Refresh access token using HttpOnly cookie
 * - logout: Invalidate session
 */
export function createPartnerAuthEndpoints(client: AxiosInstance) {
  return {
    /**
     * Initiates partner authentication by sending an OTP to the provided phone number.
     * @param phone - E.164 formatted phone number (e.g., +919876543210)
     */
    initiate: (phone: string) =>
      client.post<InitiateResponse>('/api/v1/partners/auth/initiate', { phone }),

    /**
     * Validates the OTP and returns access token + partner data.
     * @param token - Token received from initiate response
     * @param secret - OTP entered by the user
     * @param fullName - Optional full name for new partner registration
     */
    validate: (token: string, secret: string, fullName?: string) =>
      client.post<PartnerValidateResponse>('/api/v1/partners/auth/validate', {
        token,
        secret,
        ...(fullName ? { fullName } : {}),
      }),

    /**
     * Refreshes the access token using the HttpOnly refresh cookie.
     * The cookie is sent automatically via withCredentials.
     */
    refresh: () =>
      client.post<RefreshResponse>(
        '/api/v1/partners/auth/refresh',
        {},
        { withCredentials: true }
      ),

    /**
     * Logs out the partner, invalidating the current session.
     */
    logout: () => client.post('/api/v1/partners/auth/logout'),
  };
}
