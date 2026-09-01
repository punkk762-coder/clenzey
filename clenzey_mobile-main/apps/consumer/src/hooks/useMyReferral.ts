import { useQuery } from '@tanstack/react-query';
import type { ReferralProfile } from '@clenzey/types';
import { referralsApi } from '../lib/api';

export const MY_REFERRAL_QUERY_KEY = ['referrals', 'me'] as const;

/**
 * Fetches the current user's referral profile, rewards, and apply status.
 * Used on the Refer & Earn screen (mount + pull-to-refresh).
 */
export function useMyReferral() {
  return useQuery<ReferralProfile>({
    queryKey: MY_REFERRAL_QUERY_KEY,
    queryFn: async () => {
      const result = await referralsApi.getMe();
      return result as unknown as ReferralProfile;
    },
  });
}
