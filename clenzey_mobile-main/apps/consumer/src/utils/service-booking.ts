import type { Service, ServiceVariant } from '@clenzey/types';

export function isCorporateB2BService(
  service?: Pick<Service, 'category' | 'serviceType'> | null,
): boolean {
  return service?.category === 'CORPORATE' || service?.serviceType === 'B2B';
}

export function serviceUsesNestedCapacity(service?: Service | null): boolean {
  return (
    service?.variants.some((variant) => (variant.subVariants?.length ?? 0) > 0) ?? false
  );
}

export function serviceHasCapacityOptions(service?: Service | null): boolean {
  if (!isCorporateB2BService(service)) {
    return false;
  }
  if (serviceUsesNestedCapacity(service)) {
    return true;
  }
  return (service?.variants.length ?? 0) > 0;
}

export function isMisconfiguredCorporateService(service?: Service | null): boolean {
  return isCorporateB2BService(service) && !serviceHasCapacityOptions(service);
}

export function variantRequiresSubVariant(
  service: Pick<Service, 'category' | 'serviceType'> | null | undefined,
  variant: ServiceVariant | null | undefined,
): boolean {
  return isCorporateB2BService(service) && (variant?.subVariants?.length ?? 0) > 0;
}

/**
 * Normalizes variant/sub-variant IDs for booking APIs.
 * sub_variant_id is optional for flat corporate services and must differ from variant_id.
 */
export function resolveBookingVariantIds(
  variantId: string | undefined,
  subVariantId?: string,
): { variantId: string | undefined; subVariantId: string | undefined } {
  if (!variantId) {
    return { variantId, subVariantId: undefined };
  }

  const normalizedSubVariantId =
    subVariantId && subVariantId !== variantId ? subVariantId : undefined;

  return { variantId, subVariantId: normalizedSubVariantId };
}
