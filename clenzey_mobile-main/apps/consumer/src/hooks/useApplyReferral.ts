import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@clenzey/api-client';
import type { ApplyReferralResponse } from '@clenzey/types';
import { referralsApi } from '../lib/api';
import { getErrorMessage } from '../utils/error-message';
import { MY_REFERRAL_QUERY_KEY } from './useMyReferral';

const MAX_REFERRAL_CODE_LENGTH = 32;

export function normalizeReferralCode(code: string): string {
  return code.trim().slice(0, MAX_REFERRAL_CODE_LENGTH);
}

/**
 * Applies a friend's referral code from the Refer & Earn screen.
 */
export function useApplyReferral() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const mutation = useMutation<ApplyReferralResponse, unknown, string>({
    mutationFn: async (rawCode) => {
      const referralCode = normalizeReferralCode(rawCode);
      if (!referralCode) {
        throw { success: false, message: 'Please enter a referral code', statusCode: 422 };
      }
      const result = await referralsApi.apply({ referralCode });
      return result as unknown as ApplyReferralResponse;
    },
    onSuccess: () => {
      setError(null);
      setAlreadyApplied(false);
      queryClient.invalidateQueries({ queryKey: MY_REFERRAL_QUERY_KEY });
    },
    onError: (err) => {
      if (isApiError(err) && err.statusCode === 409) {
        setAlreadyApplied(true);
        setError(err.message);
        queryClient.invalidateQueries({ queryKey: MY_REFERRAL_QUERY_KEY });
        return;
      }
      setAlreadyApplied(false);
      setError(getErrorMessage(err, 'Failed to apply referral code. Please try again.'));
    },
  });

  const apply = useCallback(
    (code: string) => {
      setError(null);
      mutation.mutate(code);
    },
    [mutation],
  );

  const reset = useCallback(() => {
    setError(null);
    setAlreadyApplied(false);
    mutation.reset();
  }, [mutation]);

  return {
    apply,
    isApplying: mutation.isPending,
    error,
    alreadyApplied,
    lastReward: mutation.data?.yourReward ?? null,
    reset,
  };
}
