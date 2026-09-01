import type { CouponOffer } from '@clenzey/api-client';
import type { Service } from '@clenzey/types';

export function normalizeCategory(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export function getOfferApplicableServices(
  offer: CouponOffer,
  services: Service[] | undefined,
): Service[] {
  if (!services?.length) return [];

  const categories = offer.applicableCategories ?? [];
  if (categories.length === 0) return services;

  const normalizedCategories = new Set(categories.map(normalizeCategory));
  return services.filter((service) =>
    normalizedCategories.has(normalizeCategory(service.category)),
  );
}

export function hasOfferApplicableServices(
  offer: CouponOffer,
  services: Service[] | undefined,
): boolean {
  return getOfferApplicableServices(offer, services).length > 0;
}

export function formatOfferDiscount(offer: CouponOffer): string {
  if (offer.discountType === 'PERCENTAGE') {
    const suffix =
      offer.maxDiscountAmount != null
        ? ` (up to ₹${offer.maxDiscountAmount.toLocaleString('en-IN')})`
        : '';
    return `${offer.discountValue}% off${suffix}`;
  }

  return `₹${offer.discountValue.toLocaleString('en-IN')} off`;
}
