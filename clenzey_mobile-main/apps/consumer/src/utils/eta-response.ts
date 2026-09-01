import { isApiError } from '@clenzey/api-client';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export interface BookingEta {
  etaMinutes: number;
}

/** True when the ETA endpoint exists but has no value yet for this booking. */
export function isEtaUnavailableError(error: unknown): boolean {
  if (!isApiError(error)) return false;

  if (error.statusCode === 404) return true;

  const message = error.message.toLowerCase();
  return message.includes('eta not yet calculated') || message.includes('eta not available');
}

/**
 * Rough travel-time estimate from partner coordinates to the service address.
 * Used when REST/socket ETA is not ready but live location is streaming.
 */
export function estimateTravelMinutes(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(toLatitude - fromLatitude);
  const dLng = toRadians(toLongitude - fromLongitude);
  const fromLat = toRadians(fromLatitude);
  const toLat = toRadians(toLatitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) ** 2;
  const distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  const averageSpeedKmh = 25;
  return Math.max(1, Math.ceil((distanceKm / averageSpeedKmh) * 60));
}

function isValidEtaMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Normalizes GET /bookings/:id/eta responses.
 * Handles both interceptor-unwrapped payloads and nested `{ data: { etaMinutes } }` shapes.
 */
export function normalizeEtaResponse(value: unknown): BookingEta {
  const record = asRecord(value);
  if (!record) {
    throw new Error('Invalid ETA response');
  }

  if (isValidEtaMinutes(record.etaMinutes)) {
    return { etaMinutes: record.etaMinutes };
  }

  const nested = asRecord(record.data);
  if (nested && isValidEtaMinutes(nested.etaMinutes)) {
    return { etaMinutes: nested.etaMinutes };
  }

  throw new Error('Invalid ETA response');
}

export function formatEtaMinutes(etaMinutes: number): string {
  const rounded = Math.max(1, Math.round(etaMinutes));
  return rounded === 1 ? '~1 min' : `~${rounded} min`;
}
