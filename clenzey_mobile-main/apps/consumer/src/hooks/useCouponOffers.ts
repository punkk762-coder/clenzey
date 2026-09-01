import { useQuery } from '@tanstack/react-query';
import { couponsApi } from '../lib/api';
import type { CouponOffer } from '@clenzey/api-client';

/**
 * React Query hook for fetching public coupon offers.
 * Used on the home screen promo banner.
 */
export function useCouponOffers(limit = 10) {
  return useQuery<CouponOffer[]>({
    queryKey: ['couponOffers', limit],
    queryFn: async () => {
      const result = await couponsApi.listOffers({ limit });
      // Response interceptor unwraps { success, data } → data
      // data shape is { offers: [...] }
      return (result as unknown as { offers: CouponOffer[] }).offers;
    },
  });
}
