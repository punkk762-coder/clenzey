import type { Service, ServiceSubVariant, ServiceVariant } from '@clenzey/types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeSubVariant(value: unknown): ServiceSubVariant | null {
  const record = asRecord(value);
  if (!record?.id) return null;

  return {
    id: String(record.id),
    label: String(record.label ?? record.name ?? ''),
    value: String(record.value ?? record.label ?? ''),
    basePrice: String(record.basePrice ?? record.price ?? '0'),
    sortOrder: Number(record.sortOrder ?? 0),
    discountedPrice:
      record.discountedPrice != null ? String(record.discountedPrice) : undefined,
    discountPercentage:
      record.discountPercentage != null ? Number(record.discountPercentage) : undefined,
  };
}

function normalizeVariant(value: unknown): ServiceVariant | null {
  const record = asRecord(value);
  if (!record?.id) return null;

  const subVariantsRaw = record.subVariants ?? record.sub_variants ?? [];
  const subVariants = Array.isArray(subVariantsRaw)
    ? subVariantsRaw
        .map(normalizeSubVariant)
        .filter((item): item is ServiceSubVariant => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return {
    id: String(record.id),
    label: String(record.label ?? record.name ?? ''),
    value: String(record.value ?? ''),
    basePrice: String(record.basePrice ?? record.price ?? '0'),
    sortOrder: Number(record.sortOrder ?? 0),
    subVariants: subVariants.length > 0 ? subVariants : undefined,
  };
}

/**
 * Normalizes service API responses, including nested B2B sub-variants.
 */
export function normalizeService(value: unknown): Service {
  const record = asRecord(value);
  if (!record?.id) {
    throw new Error('Service response missing id');
  }

  const variantsRaw = record.variants ?? [];
  const variants = Array.isArray(variantsRaw)
    ? variantsRaw
        .map(normalizeVariant)
        .filter((item): item is ServiceVariant => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return {
    ...(record as unknown as Service),
    serviceType: (record.serviceType ?? record.service_type) as Service['serviceType'],
    variants,
  };
}
