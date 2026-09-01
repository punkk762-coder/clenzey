import type { GeocodedAddress, PlacePrediction } from '@clenzey/api-client';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function unwrapPayload(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  if ('data' in record && asRecord(record.data)) {
    return asRecord(record.data);
  }
  return record;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return undefined;
}

function resolveAddressRecord(payload: Record<string, unknown>): Record<string, unknown> {
  return asRecord(payload.address) ?? payload;
}

export function normalizePlacePredictions(value: unknown): PlacePrediction[] {
  const payload = unwrapPayload(value);
  if (!payload) return [];

  const rawItems = payload.predictions ?? payload.suggestions;
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item, index) => {
      if (typeof item === 'string') {
        return { placeId: String(index), description: item };
      }

      const record = asRecord(item);
      if (!record) return null;

      const description = (
        readString(record, 'description', 'text', 'formattedAddress', 'address') ??
        [readString(record, 'mainText'), readString(record, 'secondaryText')]
          .filter(Boolean)
          .join(', ')
      ).trim();

      if (!description) return null;

      return {
        placeId: String(record.placeId ?? record.place_id ?? record.id ?? index),
        description,
      };
    })
    .filter((item): item is PlacePrediction => item != null);
}

export function normalizeGeocodedAddress(value: unknown): GeocodedAddress | undefined {
  const payload = unwrapPayload(value);
  if (!payload) return undefined;

  const address = resolveAddressRecord(payload);
  const line1 =
    readString(address, 'line1', 'line_1', 'addressLine1', 'street', 'streetAddress') ??
    readString(address, 'formattedAddress', 'formatted_address');

  return {
    line1,
    line2: readString(address, 'line2', 'line_2', 'addressLine2'),
    city: readString(address, 'city', 'locality'),
    state: readString(address, 'state', 'administrativeArea', 'administrative_area'),
    pincode: readString(address, 'pincode', 'postalCode', 'postal_code', 'zipCode'),
    country: readString(address, 'country'),
  };
}

export function normalizePlaceDetails(value: unknown): {
  latitude: number;
  longitude: number;
  address: GeocodedAddress;
} | null {
  const payload = unwrapPayload(value);
  if (!payload) return null;

  const addressRecord = resolveAddressRecord(payload);
  const latitude = Number(
    addressRecord.latitude ?? addressRecord.lat ?? payload.latitude ?? payload.lat,
  );
  const longitude = Number(
    addressRecord.longitude ??
      addressRecord.lng ??
      addressRecord.lon ??
      payload.longitude ??
      payload.lng ??
      payload.lon,
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const address = normalizeGeocodedAddress(addressRecord);
  if (!address) return null;

  return { latitude, longitude, address };
}
