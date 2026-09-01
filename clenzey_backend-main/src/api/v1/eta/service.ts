import { NotFoundError } from "../../../errors/appErrors.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import * as etaRepo from "./repository.ts";

const ROAD_FACTOR = 1.4;
const AVG_SPEED_KMH = 25;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_SERVICE_RADIUS_KM = 50;
const MAX_ETA_MINUTES = 180;

export type ETAResult = {
  distanceKm: number;
  etaMinutes: number;
  isStale: boolean;
  lastUpdatedAt: string;
  partnerLocation?: { lat: number; lng: number } | undefined;
};

/**
 * Convert degrees to radians.
 */
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Calculate the straight-line (great-circle) distance between two points
 * using the Haversine formula.
 * @returns Distance in kilometers.
 */
export const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Calculate ETA in minutes from partner location to destination.
 * Uses straight-line distance * road factor / average speed.
 * @returns ETA in minutes (rounded up).
 */
export const calculateETA = (
  partnerLat: number,
  partnerLng: number,
  destLat: number,
  destLng: number,
): number => {
  const straightLineKm = haversineDistance(partnerLat, partnerLng, destLat, destLng);
  if (straightLineKm > MAX_SERVICE_RADIUS_KM) {
    throw new Error("Partner is outside service range for ETA calculation");
  }

  const roadDistanceKm = straightLineKm * ROAD_FACTOR;
  const etaMinutes = (roadDistanceKm / AVG_SPEED_KMH) * 60;
  return Math.min(MAX_ETA_MINUTES, Math.max(1, Math.ceil(etaMinutes)));
};

/**
 * Get the stored ETA for a booking. Validates that the booking exists,
 * belongs to the requesting user, and is in PROFESSIONAL_EN_ROUTE status.
 * Adds staleness indicator if the ETA hasn't been updated in 5+ minutes.
 */
export const getBookingETA = async (
  bookingId: string,
  userId: string,
): Promise<ETAResult> => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  // Validate user has access (consumer or assigned partner)
  if (booking.consumerId !== userId && booking.partnerId !== userId) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.status !== "PROFESSIONAL_EN_ROUTE") {
    throw new NotFoundError("ETA is only available when partner is en route");
  }

  const etaRecord = await etaRepo.getEta(bookingId);
  const address = await bookingsRepo.findAddressById(booking.addressId);

  let etaMinutes: number | null = null;
  let distanceKm = 0;
  let partnerLocation:
    | {
        lat: number;
        lng: number;
      }
    | undefined;
  let lastUpdatedAt = new Date().toISOString();

  if (
    etaRecord?.lastPartnerLat &&
    etaRecord.lastPartnerLng &&
    address?.latitude &&
    address?.longitude
  ) {
    try {
      const partnerLat = Number(etaRecord.lastPartnerLat);
      const partnerLng = Number(etaRecord.lastPartnerLng);
      const destLat = Number(address.latitude);
      const destLng = Number(address.longitude);

      etaMinutes = calculateETA(partnerLat, partnerLng, destLat, destLng);
      const straightLineKm = haversineDistance(
        partnerLat,
        partnerLng,
        destLat,
        destLng,
      );
      distanceKm = straightLineKm * ROAD_FACTOR;
      partnerLocation = { lat: partnerLat, lng: partnerLng };
      lastUpdatedAt = etaRecord.updatedAt.toISOString();
    } catch {
      etaMinutes = null;
    }
  }

  if (etaMinutes == null && etaRecord) {
    const storedEta = Number(etaRecord.etaMinutes);
    if (
      Number.isFinite(storedEta) &&
      storedEta > 0 &&
      storedEta <= MAX_ETA_MINUTES
    ) {
      etaMinutes = Math.ceil(storedEta);
      distanceKm = etaRecord.distanceKm ? Number(etaRecord.distanceKm) : 0;
      partnerLocation =
        etaRecord.lastPartnerLat && etaRecord.lastPartnerLng
          ? {
              lat: Number(etaRecord.lastPartnerLat),
              lng: Number(etaRecord.lastPartnerLng),
            }
          : undefined;
      lastUpdatedAt = etaRecord.updatedAt.toISOString();
    }
  }

  if (etaMinutes == null && booking.partnerId && address?.latitude && address?.longitude) {
    const livePartnerLocation = await etaRepo.getPartnerLocation(booking.partnerId);
    if (livePartnerLocation) {
      try {
        etaMinutes = calculateETA(
          livePartnerLocation.latitude,
          livePartnerLocation.longitude,
          Number(address.latitude),
          Number(address.longitude),
        );
        const straightLineKm = haversineDistance(
          livePartnerLocation.latitude,
          livePartnerLocation.longitude,
          Number(address.latitude),
          Number(address.longitude),
        );
        distanceKm = straightLineKm * ROAD_FACTOR;
        partnerLocation = {
          lat: livePartnerLocation.latitude,
          lng: livePartnerLocation.longitude,
        };
        lastUpdatedAt = livePartnerLocation.lastSeenAt.toISOString();
      } catch {
        etaMinutes = null;
      }
    }
  }

  if (etaMinutes == null) {
    throw new NotFoundError("ETA not yet calculated for this booking");
  }

  if (
    etaMinutes > MAX_ETA_MINUTES ||
    distanceKm > MAX_SERVICE_RADIUS_KM * ROAD_FACTOR
  ) {
    throw new NotFoundError("ETA not yet calculated for this booking");
  }

  const isStale = etaRecord
    ? Date.now() - etaRecord.updatedAt.getTime() > STALE_THRESHOLD_MS
    : false;

  return {
    distanceKm,
    etaMinutes,
    isStale,
    lastUpdatedAt,
    partnerLocation,
  };
};

/**
 * Recalculate and store the ETA for a booking based on new partner coordinates.
 * Called when a partner sends a location ping while en route.
 */
export const recalculateETA = async (
  bookingId: string,
  partnerLat: number,
  partnerLng: number,
): Promise<ETAResult> => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  // Get the destination address coordinates
  const address = await bookingsRepo.findAddressById(booking.addressId);
  if (!address || !address.latitude || !address.longitude) {
    throw new NotFoundError("Booking address coordinates not available");
  }

  const destLat = Number(address.latitude);
  const destLng = Number(address.longitude);

  let etaMinutes: number;
  let distanceKm: number;

  try {
    etaMinutes = calculateETA(partnerLat, partnerLng, destLat, destLng);
    const straightLineKm = haversineDistance(partnerLat, partnerLng, destLat, destLng);
    distanceKm = straightLineKm * ROAD_FACTOR;
  } catch {
    throw new NotFoundError("Partner is outside service range for ETA calculation");
  }

  const etaRecord = await etaRepo.upsertEta({
    bookingId,
    distanceKm: String(distanceKm),
    etaMinutes,
    lastPartnerLat: String(partnerLat),
    lastPartnerLng: String(partnerLng),
    updatedAt: new Date(),
  });

  return {
    distanceKm: Number(etaRecord.distanceKm),
    etaMinutes: etaRecord.etaMinutes,
    isStale: false,
    lastUpdatedAt: etaRecord.updatedAt.toISOString(),
    partnerLocation: { lat: partnerLat, lng: partnerLng },
  };
};
