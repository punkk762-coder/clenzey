import { sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import logger from "../../../configs/loggerConfig.ts";

const STALE_LOCATION_THRESHOLD_MIN = 5;
const RADIUS_INCREMENT_METERS = 2000; // 2km increments
const MAX_RADIUS_METERS = 15000; // 15km max

export type NearestPartner = {
  distanceMeters: number;
  lastSeenAt: Date;
  partnerId: string;
};

/**
 * Finds the nearest online + approved + available partner with no active
 * (non-terminal) booking. Returns up to `limit` candidates ordered by distance.
 *
 * When `serviceId` is provided, only partners with that skill are considered.
 *
 * If no partners are found within the initial radius, the search expands by
 * 2km increments up to 15km max before giving up.
 *
 * Ranking criteria:
 *   - partner_locations.is_online = true
 *   - partner_locations.last_seen_at within STALE_LOCATION_THRESHOLD_MIN
 *   - partners.is_available = true AND approval_status = 'APPROVED'
 *   - no booking_assignments with status='ACCEPTED' linked to a booking
 *     in a non-terminal state for the partner
 *   - ST_DWithin within current search radius
 *   - (optional) partner has the required service skill
 */
export const findNearestPartners = async (params: {
  latitude: number;
  limit?: number;
  longitude: number;
  maxDistanceMeters?: number;
  serviceId?: string;
}): Promise<NearestPartner[]> => {
  const limit = params.limit ?? 5;
  const initialRadius = params.maxDistanceMeters ?? 5000; // default 5km initial radius

  // Radius expansion: try increasing radii until we find partners or hit MAX_RADIUS_METERS
  let currentRadius = initialRadius;

  while (currentRadius <= MAX_RADIUS_METERS) {
    const queryParams: Parameters<typeof queryNearestPartners>[0] = {
      latitude: params.latitude,
      limit,
      longitude: params.longitude,
      maxDistanceMeters: currentRadius,
    };
    if (params.serviceId) {
      queryParams.serviceId = params.serviceId;
    }
    const partners = await queryNearestPartners(queryParams);

    if (partners.length > 0) {
      return partners;
    }

    // Expand radius by 2km
    currentRadius += RADIUS_INCREMENT_METERS;
  }

  // No partners found even at max radius
  return [];
};

/**
 * Internal query function that searches for partners within a specific radius.
 */
const queryNearestPartners = async (params: {
  latitude: number;
  limit: number;
  longitude: number;
  maxDistanceMeters: number;
  serviceId?: string;
}): Promise<NearestPartner[]> => {
  const { latitude, limit, longitude, maxDistanceMeters, serviceId } = params;

  const skillJoin = serviceId
    ? sql`JOIN partner_skills ps ON ps.partner_id = pl.partner_id AND ps.service_id = ${serviceId}`
    : sql``;

  try {
    const result = await db.execute<{
      distance: number;
      last_seen_at: Date;
      partner_id: string;
    }>(sql`
      SELECT
        pl.partner_id,
        pl.last_seen_at,
        ST_Distance(
          COALESCE(pl.location, p.base_location),
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) AS distance
      FROM partner_locations pl
      JOIN partners p ON p.id = pl.partner_id
      ${skillJoin}
      WHERE pl.is_online = true
        AND COALESCE(pl.location, p.base_location) IS NOT NULL
        AND (
          pl.last_seen_at > NOW() - (${STALE_LOCATION_THRESHOLD_MIN} || ' minutes')::interval
          OR p.base_location IS NOT NULL
        )
        AND p.is_available = true
        AND p.approval_status = 'APPROVED'
        AND ST_DWithin(
          COALESCE(pl.location, p.base_location),
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${maxDistanceMeters}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.partner_id = pl.partner_id
            AND b.status IN (
              'PROFESSIONAL_ASSIGNED',
              'PROFESSIONAL_EN_ROUTE',
              'CHECKED_IN',
              'IN_PROGRESS'
            )
        )
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return result.rows.map((r) => ({
      distanceMeters: Math.round(Number(r.distance)),
      lastSeenAt: new Date(r.last_seen_at),
      partnerId: r.partner_id,
    }));
  } catch {
    logger.warn("PostGIS unavailable — returning all online/available partners without distance filter");
    // Fallback: return all online, available, approved partners without distance filtering
    const fallback = await db.execute<{
      last_seen_at: Date;
      partner_id: string;
    }>(sql`
      SELECT
        pl.partner_id,
        pl.last_seen_at
      FROM partner_locations pl
      JOIN partners p ON p.id = pl.partner_id
      ${skillJoin}
      WHERE pl.is_online = true
        AND p.is_available = true
        AND p.approval_status = 'APPROVED'
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.partner_id = pl.partner_id
            AND b.status IN (
              'PROFESSIONAL_ASSIGNED',
              'PROFESSIONAL_EN_ROUTE',
              'CHECKED_IN',
              'IN_PROGRESS'
            )
        )
      LIMIT ${limit}
    `);
    return fallback.rows.map((r) => ({
      distanceMeters: 0,
      lastSeenAt: new Date(r.last_seen_at),
      partnerId: r.partner_id,
    }));
  }
};

/**
 * Finds nearest approved + available partners with the required skill and a
 * known last location. Unlike instant dispatch, does NOT require online status
 * or a recent location ping — used for scheduled booking availability checks.
 */
export const findNearestEligiblePartnersForScheduled = async (params: {
  latitude: number;
  limit?: number;
  longitude: number;
  maxDistanceMeters?: number;
  serviceId: string;
}): Promise<NearestPartner[]> => {
  const limit = params.limit ?? 10;
  const initialRadius = params.maxDistanceMeters ?? 5000;
  let currentRadius = initialRadius;

  while (currentRadius <= MAX_RADIUS_METERS) {
    const partners = await queryScheduledEligiblePartners({
      latitude: params.latitude,
      limit,
      longitude: params.longitude,
      maxDistanceMeters: currentRadius,
      serviceId: params.serviceId,
    });

    if (partners.length > 0) {
      return partners;
    }

    currentRadius += RADIUS_INCREMENT_METERS;
  }

  return [];
};

const queryScheduledEligiblePartners = async (params: {
  latitude: number;
  limit: number;
  longitude: number;
  maxDistanceMeters: number;
  serviceId: string;
}): Promise<NearestPartner[]> => {
  const { latitude, limit, longitude, maxDistanceMeters, serviceId } = params;

  try {
    const result = await db.execute<{
      distance: number;
      last_seen_at: Date;
      partner_id: string;
    }>(sql`
      SELECT
        pl.partner_id,
        pl.last_seen_at,
        ST_Distance(
          pl.location,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) AS distance
      FROM partner_locations pl
      JOIN partners p ON p.id = pl.partner_id
      JOIN partner_skills ps ON ps.partner_id = pl.partner_id AND ps.service_id = ${serviceId}
      WHERE pl.location IS NOT NULL
        AND p.is_available = true
        AND p.approval_status = 'APPROVED'
        AND ST_DWithin(
          pl.location,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${maxDistanceMeters}
        )
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return result.rows.map((r) => ({
      distanceMeters: Math.round(Number(r.distance)),
      lastSeenAt: new Date(r.last_seen_at),
      partnerId: r.partner_id,
    }));
  } catch {
    logger.warn("PostGIS unavailable — returning all available partners for scheduled matching");
    const fallback = await db.execute<{
      last_seen_at: Date;
      partner_id: string;
    }>(sql`
      SELECT
        pl.partner_id,
        pl.last_seen_at
      FROM partner_locations pl
      JOIN partners p ON p.id = pl.partner_id
      JOIN partner_skills ps ON ps.partner_id = pl.partner_id AND ps.service_id = ${serviceId}
      WHERE pl.location IS NOT NULL
        AND p.is_available = true
        AND p.approval_status = 'APPROVED'
      LIMIT ${limit}
    `);
    return fallback.rows.map((r) => ({
      distanceMeters: 0,
      lastSeenAt: new Date(r.last_seen_at),
      partnerId: r.partner_id,
    }));
  }
};
