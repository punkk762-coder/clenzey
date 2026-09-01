import type { AxiosInstance } from 'axios';
import type {
  ApplyReferralPayload,
  ApplyReferralResponse,
  ReferralProfile,
} from '@clenzey/types';

/**
 * Creates the referrals endpoint module.
 *
 * Provides typed methods for the Refer & Earn feature:
 * - getMe: Fetch the user's referral code, rewards, and apply status
 * - apply: Apply a friend's referral code
 */
export function createReferralsEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/referrals/me — Referral profile, rewards, and apply status */
    getMe: () => client.get<ReferralProfile>('/api/v1/referrals/me'),

    /** POST /api/v1/referrals/apply — Apply a friend's referral code */
    apply: (data: ApplyReferralPayload) =>
      client.post<ApplyReferralResponse>('/api/v1/referrals/apply', data),
  };
}
