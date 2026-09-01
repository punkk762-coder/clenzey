import { sql } from "drizzle-orm";

import {
  DEFAULT_RATING,
  dispatchConfig,
  SCORE_WEIGHTS,
} from "../../../configs/dispatchConfig.ts";
import db from "../../../db/index.ts";
import logger from "../../../configs/loggerConfig.ts";
import { parsePointWkt } from "../../../utilities/geoUtils.ts";
import { getIstParts } from "../../../utilities/timezoneUtils.ts";

const DAY_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export type DispatchMode = "INSTANT" | "SCHEDULED_BATCH" | "SCHEDULED_REVALIDATE";

export type ScoredPartnerCandidate = {
  avgRating: number;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  partnerId: string;
  score: number;
  workload: number;
};

export type FindCandidatesInput = {
  excludePartnerIds?: string[];
  latitude: number;
  limit?: number;
  longitude: number;
  maxRadiusMeters: number;
  mode: DispatchMode;
  scheduledAt?: Date | null;
  scheduledEndAt?: Date | null;
  serviceId: string;
  zoneId: string;
};

const requiredEndHourIst = (slotStart: Date, durationMin: number): number => {
  const endAt = new Date(slotStart.getTime() + durationMin * 60_000);
  const endParts = getIstParts(endAt);
  if (endParts.minute > 0 || endParts.second > 0) {
    return endParts.hour + 1;
  }
  return endParts.hour;
};

export const findScoredCandidates = async (
  input: FindCandidatesInput,
): Promise<ScoredPartnerCandidate[]> => {
  const limit = input.limit ?? 5;
  const excludeIds = input.excludePartnerIds ?? [];
  const staleMin = dispatchConfig.locationStaleMin;
  const maxCapacity = dispatchConfig.maxDailyCapacity;
  const maxRadius = input.maxRadiusMeters;

  const destPoint = sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography`;

  const requireOnline =
    input.mode === "INSTANT" || input.mode === "SCHEDULED_REVALIDATE";

  const locationExpr = sql`COALESCE(pl.location, p.base_location)`;

  const onlineFilter = requireOnline
    ? sql`AND pl.is_online = true
        AND COALESCE(pl.location, p.base_location) IS NOT NULL
        AND (
          pl.last_seen_at > NOW() - (${staleMin} || ' minutes')::interval
          OR p.base_location IS NOT NULL
        )`
    : sql``;

  const locationNotNull = sql`COALESCE(pl.location, p.base_location) IS NOT NULL`;

  let availabilityFilter = sql``;
  if (
    (input.mode === "SCHEDULED_BATCH" ||
      input.mode === "SCHEDULED_REVALIDATE") &&
    input.scheduledAt
  ) {
    const dayOfWeek =
      DAY_OF_WEEK[getIstParts(input.scheduledAt).dayOfWeek] ?? "MON";
    const startHour = getIstParts(input.scheduledAt).hour;
    const durationMin =
      input.scheduledEndAt && input.scheduledAt
        ? Math.round(
            (input.scheduledEndAt.getTime() - input.scheduledAt.getTime()) /
              60_000,
          )
        : 60;
    const endHour = requiredEndHourIst(input.scheduledAt, durationMin);

    availabilityFilter = sql`
      AND EXISTS (
        SELECT 1
        FROM partner_availability pa
        WHERE pa.partner_id = p.id
          AND pa.is_active = true
          AND pa.day_of_week = ${dayOfWeek}
          AND pa.start_hour <= ${startHour}
          AND pa.end_hour >= ${endHour}
      )
    `;
  }

  let conflictFilter = sql``;
  if (input.mode === "INSTANT") {
    conflictFilter = sql`
      AND NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN (
            'PROFESSIONAL_EN_ROUTE',
            'CHECKED_IN',
            'IN_PROGRESS'
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status = 'PROFESSIONAL_ASSIGNED'
          AND (
            b.booking_type = 'INSTANT'
            OR b.scheduled_at <= NOW() + INTERVAL '30 minutes'
          )
      )
    `;
  } else if (input.scheduledAt && input.scheduledEndAt) {
    conflictFilter = sql`
      AND NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN (
            'PROFESSIONAL_EN_ROUTE',
            'CHECKED_IN',
            'IN_PROGRESS'
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN (
            'PROFESSIONAL_ASSIGNED',
            'PROFESSIONAL_EN_ROUTE',
            'CHECKED_IN',
            'IN_PROGRESS'
          )
          AND b.scheduled_at IS NOT NULL
          AND b.scheduled_at < ${input.scheduledEndAt}
          AND COALESCE(
            b.scheduled_end_at,
            b.scheduled_at + (b.estimated_duration_min || ' minutes')::interval
          ) > ${input.scheduledAt}
      )
    `;
  }

  const excludeFilter =
    excludeIds.length > 0
      ? sql`AND p.id NOT IN (${sql.join(
          excludeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``;

  try {
    const result = await db.execute<{
      avg_rating: string | null;
      distance: number;
      lat: number;
      lng: number;
      partner_id: string;
      score: number;
      workload: number;
    }>(sql`
      WITH candidates AS (
        SELECT
          p.id AS partner_id,
          COALESCE(p.avg_rating::float, ${DEFAULT_RATING}) AS avg_rating,
          ST_Distance(${locationExpr}, ${destPoint}) AS distance,
          ST_Y(${locationExpr}::geometry) AS lat,
          ST_X(${locationExpr}::geometry) AS lng,
          (
            SELECT COUNT(*)::int
            FROM bookings b
            WHERE b.partner_id = p.id
              AND b.status IN (
                'PROFESSIONAL_ASSIGNED',
                'PROFESSIONAL_EN_ROUTE',
                'CHECKED_IN',
                'IN_PROGRESS'
              )
          ) AS workload
        FROM partners p
        INNER JOIN partner_zones pz
          ON pz.partner_id = p.id
          AND pz.zone_id = ${input.zoneId}
        INNER JOIN partner_skills ps
          ON ps.partner_id = p.id
          AND ps.service_id = ${input.serviceId}
        LEFT JOIN partner_locations pl ON pl.partner_id = p.id
        WHERE p.approval_status = 'APPROVED'
          AND p.is_available = true
          AND ${locationNotNull}
          ${onlineFilter}
          ${availabilityFilter}
          ${conflictFilter}
          ${excludeFilter}
          AND ST_DWithin(${locationExpr}, ${destPoint}, ${maxRadius})
      )
      SELECT
        partner_id,
        distance,
        lat,
        lng,
        avg_rating,
        workload,
        (
          (distance / ${maxRadius}) * ${SCORE_WEIGHTS.distance}
          + (1 - LEAST(avg_rating, 5) / 5.0) * ${SCORE_WEIGHTS.rating}
          + (workload::float / ${maxCapacity}) * ${SCORE_WEIGHTS.workload}
        ) AS score
      FROM candidates
      ORDER BY score ASC, distance ASC
      LIMIT ${limit}
    `);

    return result.rows.map((r) => ({
      avgRating: Number(r.avg_rating ?? DEFAULT_RATING),
      distanceMeters: Math.round(Number(r.distance)),
      latitude: Number(r.lat),
      longitude: Number(r.lng),
      partnerId: r.partner_id,
      score: Number(r.score),
      workload: Number(r.workload),
    }));
  } catch {
    logger.warn("PostGIS unavailable — falling back to non-spatial candidate scoring");
    // Fallback: find candidates without spatial filters, parse WKT for coords
    const fallback = await db.execute<{
      avg_rating: string | null;
      base_location_wkt: string | null;
      location_wkt: string | null;
      partner_id: string;
      workload: number;
    }>(sql`
      SELECT
        p.id AS partner_id,
        COALESCE(p.avg_rating::float, ${DEFAULT_RATING}) AS avg_rating,
        pl.location::text AS location_wkt,
        p.base_location::text AS base_location_wkt,
        (
          SELECT COUNT(*)::int
          FROM bookings b
          WHERE b.partner_id = p.id
            AND b.status IN (
              'PROFESSIONAL_ASSIGNED',
              'PROFESSIONAL_EN_ROUTE',
              'CHECKED_IN',
              'IN_PROGRESS'
            )
        ) AS workload
      FROM partners p
      INNER JOIN partner_zones pz
        ON pz.partner_id = p.id
        AND pz.zone_id = ${input.zoneId}
      INNER JOIN partner_skills ps
        ON ps.partner_id = p.id
        AND ps.service_id = ${input.serviceId}
      LEFT JOIN partner_locations pl ON pl.partner_id = p.id
      WHERE p.approval_status = 'APPROVED'
        AND p.is_available = true
        ${onlineFilter}
        ${availabilityFilter}
        ${conflictFilter}
        ${excludeFilter}
      LIMIT ${limit}
    `);

    return fallback.rows.map((r) => {
      const parsed = parsePointWkt(r.location_wkt) ?? parsePointWkt(r.base_location_wkt);
      return {
        avgRating: Number(r.avg_rating ?? DEFAULT_RATING),
        distanceMeters: 0,
        latitude: parsed?.lat ?? 0,
        longitude: parsed?.lng ?? 0,
        partnerId: r.partner_id,
        score: 0,
        workload: Number(r.workload),
      };
    });
  }
};

export const expandRadius = (currentRadius: number): number =>
  Math.min(
    currentRadius + dispatchConfig.radiusIncrementM,
    dispatchConfig.maxRadiusM,
  );
