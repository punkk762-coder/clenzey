import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ValidateCouponPayload, ValidateCouponResponse } from '@clenzey/api-client';
import { couponsApi } from '../lib/api';

/**
 * Hook for validating coupon codes against the API.
 *
 * Wraps POST /api/v1/coupons/validate in a useMutation and provides
 * reactive state for discount, error, and loading.
 *
 * Requirements: 9.1, 9.2, 9.3
 */
export function useCouponValidation() {
  const [discount, setDiscount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation<ValidateCouponResponse, Error, ValidateCouponPayload>({
    mutationFn: async (payload) => {
      const response = await couponsApi.validate(payload);
      return response.data;
    },
    onSuccess: (data) => {
      const isValid = data.valid === true || (data.valid !== false && data.discount > 0);
      if (isValid) {
        setDiscount(data.discount);
        setError(null);
      } else {
        setDiscount(null);
        setError(data.message ?? 'Invalid coupon code');
      }
    },
    onError: (err) => {
      setDiscount(null);
      setError(err.message ?? 'Failed to validate coupon');
    },
  });

  const validate = useCallback(
    (payload: ValidateCouponPayload) => {
      setDiscount(null);
      setError(null);
      mutation.mutate(payload);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setDiscount(null);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    validate,
    isValidating: mutation.isPending,
    discount,
    error,
    reset,
  };
}
