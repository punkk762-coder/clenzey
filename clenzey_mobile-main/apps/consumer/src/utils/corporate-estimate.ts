import type { Service, ServiceSubVariant, ServiceVariant } from '@clenzey/types';
import type { EstimateResult } from '../hooks/useEstimate';
import { variantRequiresSubVariant } from './service-booking';

export interface SubVariantPriceInfo {
  basePrice: number;
  effectivePrice: number;
  discountPercentage: number;
  hasDiscount: boolean;
}

export function resolveSubVariantPrice(subVariant: ServiceSubVariant): SubVariantPriceInfo {
  const basePrice = Number(subVariant.basePrice);
  const effectivePrice = Number(subVariant.discountedPrice ?? subVariant.basePrice);
  const discountPercentage = subVariant.discountPercentage ?? 0;
  const hasDiscount =
    discountPercentage > 0 && Number.isFinite(basePrice) && effectivePrice < basePrice;

  return {
    basePrice: Number.isFinite(basePrice) ? basePrice : 0,
    effectivePrice: Number.isFinite(effectivePrice) ? effectivePrice : 0,
    discountPercentage,
    hasDiscount,
  };
}

export function buildCorporateSubVariantEstimate(params: {
  variant: ServiceVariant;
  subVariant: ServiceSubVariant;
  addonsTotal?: number;
}): EstimateResult {
  const { variant, subVariant, addonsTotal = 0 } = params;
  const pricing = resolveSubVariantPrice(subVariant);
  const breakdown: EstimateResult['breakdown'] = [];

  if (pricing.hasDiscount) {
    breakdown.push({
      label: `${subVariant.label} (${variant.label})`,
      amount: pricing.basePrice,
    });
    breakdown.push({
      label: `Venue discount (${pricing.discountPercentage}% off)`,
      amount: -(pricing.basePrice - pricing.effectivePrice),
      isDiscount: true,
    });
  } else {
    breakdown.push({
      label: `${subVariant.label} — ${variant.label}`,
      amount: pricing.effectivePrice,
    });
  }

  if (addonsTotal > 0) {
    breakdown.push({
      label: 'Add-ons',
      amount: addonsTotal,
    });
  }

  return {
    total: pricing.effectivePrice + addonsTotal,
    basePrice: pricing.effectivePrice,
    addonsTotal,
    breakdown,
  };
}

export function resolveServiceEstimate(params: {
  service: Pick<Service, 'category' | 'serviceType'> | null | undefined;
  variant: ServiceVariant | null | undefined;
  subVariant: ServiceSubVariant | null | undefined;
  apiEstimate?: EstimateResult;
}): EstimateResult | undefined {
  const { service, variant, subVariant, apiEstimate } = params;

  if (subVariant && variant && variantRequiresSubVariant(service, variant)) {
    return buildCorporateSubVariantEstimate({
      variant,
      subVariant,
      addonsTotal: apiEstimate?.addonsTotal ?? 0,
    });
  }

  return apiEstimate;
}
