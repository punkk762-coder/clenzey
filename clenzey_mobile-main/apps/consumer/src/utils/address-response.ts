import type { Address, AddressType } from '@clenzey/types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeAddressRecord(record: Record<string, unknown>): Address | null {
  if (record.id == null || record.label == null) return null;

  const addressType = record.addressType;
  const normalizedType: AddressType =
    addressType === 'HOME' || addressType === 'WORK' || addressType === 'OTHER'
      ? addressType
      : 'HOME';

  return {
    id: String(record.id),
    consumerId: String(record.consumerId ?? ''),
    label: String(record.label),
    addressType: normalizedType,
    line1: String(record.line1 ?? ''),
    line2: record.line2 != null ? String(record.line2) : undefined,
    landmark: record.landmark != null ? String(record.landmark) : undefined,
    city: String(record.city ?? ''),
    state: String(record.state ?? ''),
    pincode: String(record.pincode ?? ''),
    latitude: typeof record.latitude === 'number' ? record.latitude : undefined,
    longitude: typeof record.longitude === 'number' ? record.longitude : undefined,
    isDefault: Boolean(record.isDefault),
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? ''),
  };
}

/**
 * Normalizes list addresses API responses.
 * Supports both `{ addresses: Address[] }` and plain `Address[]` shapes
 * after the axios success-envelope unwrap.
 */
export function normalizeAddressList(value: unknown): Address[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item != null)
      .map(normalizeAddressRecord)
      .filter((item): item is Address => item != null);
  }

  const record = asRecord(value);
  if (!record) return [];

  if (Array.isArray(record.addresses)) {
    return record.addresses
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item != null)
      .map(normalizeAddressRecord)
      .filter((item): item is Address => item != null);
  }

  return [];
}

/**
 * Normalizes a single address API response.
 * Supports plain `Address` and `{ address: Address }` shapes.
 */
export function normalizeAddress(value: unknown): Address | null {
  const record = asRecord(value);
  if (!record) return null;

  const direct = normalizeAddressRecord(record);
  if (direct) return direct;

  const nested = asRecord(record.address);
  if (nested) {
    return normalizeAddressRecord(nested);
  }

  return null;
}
