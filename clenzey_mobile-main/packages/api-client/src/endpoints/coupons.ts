import { AxiosInstance } from 'axios';
import type { ServiceCategory } from '@clenzey/types';

/**
 * Payload for validating a coupon code.
 */
export interface ValidateCouponPayload {
  code: string;
  amount: number;
  serviceId?: string;
  serviceCategory?: string;
}

/**
 * Response from the coupon validation endpoint.
 */
export interface ValidateCouponResponse {
  valid?: boolean;
  discount: number;
  message?: string;
  code?: string;
  couponId?: string;
  description?: string;
}

export type CouponDiscountType = 'PERCENTAGE' | 'FLAT';

/**
 * A public coupon offer for display on the home screen banner.
 */
export interface CouponOffer {
  id: string;
  code: string;
  label: string;
  title: string;
  subtitle?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  applicableCategories: ServiceCategory[];
  validUntil: string;
  ctaText: string;
}

export interface ListCouponOffersParams {
  /** Max offers to return (default 10, max 20). */
  limit?: number;
}

export interface ListCouponOffersResponse {
  offers: CouponOffer[];
}

/**
 * Creates the coupons endpoint module.
 *
 * Provides typed methods for coupon validation and public offers:
 * - validate: Check if a coupon code is valid for a given amount and service
 * - listOffers: Fetch active public coupon offers for the home screen
 */
export function createCouponsEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/coupons/offers — List active public coupon offers */
    listOffers: (params?: ListCouponOffersParams) =>
      client.get<ListCouponOffersResponse>('/api/v1/coupons/offers', { params }),

    /** POST /api/v1/coupons/validate — Validate a coupon code */
    validate: (data: ValidateCouponPayload) =>
      client.post<ValidateCouponResponse>('/api/v1/coupons/validate', data),
  };
}
