import { sql } from "drizzle-orm";
import { parsePointWkt } from "../../../utilities/geoUtils.ts";

import db from "../../../db/index.ts";
import { bookingEvents } from "../../../realtime/bookingEvents.ts";
import type { BookingStatus } from "../bookings/stateMachine.ts";

export type PartnerOperationalStatus =
  | "OFFLINE"
  | "IDLE"
  | "IN_TRANSIT"
  | "ON_JOB";

export const STALE_ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

const ACTIVE_JOB_STATUSES: BookingStatus[] = [
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
];

export type PartnerOperationalSnapshot = {
  partnerId: string;
  fullName: string | null;
  status: PartnerOperationalStatus;
  isOnline: boolean;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  activeBookingId: string | null;
  activeBookingNumber: string | null;
  activeBookingStatus: BookingStatus | null;
  timestamp: string;
};

const deriveStatus = (params: {
  isOnline: boolean;
  lastSeenAt: Date | string | null;
  bookingStatus: BookingStatus | null;
  now?: Date;
}): PartnerOperationalStatus => {
  const now = params.now ?? new Date();
  const lastSeenDate = params.lastSeenAt ? new Date(params.lastSeenAt) : null;
  const stale =
    !lastSeenDate ||
    isNaN(lastSeenDate.getTime()) ||
    now.getTime() - lastSeenDate.getTime() > STALE_ONLINE_THRESHOLD_MS;

  if (!params.isOnline || stale) return "OFFLINE";

  if (params.bookingStatus === "PROFESSIONAL_EN_ROUTE") return "IN_TRANSIT";
  if (
    params.bookingStatus === "CHECKED_IN" ||
    params.bookingStatus === "IN_PROGRESS"
  ) {
    return "ON_JOB";
  }
  return "IDLE";
};

type FleetRow = {
  partnerId: string;
  fullName: string | null;
  isOnline: boolean | null;
  lastSeenAt: Date | string | null;
  latitude: number | null;
  longitude: number | null;
  heading: string | null;
  bookingId: string | null;
  bookingNumber: string | null;
  bookingStatus: BookingStatus | null;
};

const mapRow = (row: FleetRow): PartnerOperationalSnapshot => {
  const isOnline = row.isOnline === true;
  const lastSeenDate = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
  return {
    partnerId: row.partnerId,
    fullName: row.fullName,
    status: deriveStatus({
      bookingStatus: row.bookingStatus,
      isOnline,
      lastSeenAt: lastSeenDate,
    }),
    isOnline,
    lastSeenAt: lastSeenDate && !isNaN(lastSeenDate.getTime()) ? lastSeenDate.toISOString() : null,
    latitude: row.latitude,
    longitude: row.longitude,
    heading: row.heading != null ? Number(row.heading) : null,
    activeBookingId: row.bookingId,
    activeBookingNumber: row.bookingNumber,
    activeBookingStatus: row.bookingStatus,
    timestamp: new Date().toISOString(),
  };
};

export const listPartnerOperationalStatuses = async (params: {
  limit: number;
  offset: number;
}): Promise<{ partners: PartnerOperationalSnapshot[]; total: number }> => {
  let fleetRows: FleetRow[];
  try {
    const rows = await db.execute<FleetRow>(sql`
      SELECT
        p.id AS "partnerId",
        p.full_name AS "fullName",
        COALESCE(pl.is_online, false) AS "isOnline",
        pl.last_seen_at AS "lastSeenAt",
        ST_Y(pl.location::geometry) AS latitude,
        ST_X(pl.location::geometry) AS longitude,
        pl.heading AS heading,
        ab.id AS "bookingId",
        ab.booking_number AS "bookingNumber",
        ab.status AS "bookingStatus"
      FROM partners p
      INNER JOIN users u ON u.id = p.id
      LEFT JOIN partner_locations pl ON pl.partner_id = p.id
      LEFT JOIN LATERAL (
        SELECT b.id, b.booking_number, b.status
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN ('PROFESSIONAL_EN_ROUTE', 'CHECKED_IN', 'IN_PROGRESS')
        ORDER BY b.updated_at DESC
        LIMIT 1
      ) ab ON true
      WHERE p.approval_status = 'APPROVED'
      ORDER BY p.full_name ASC NULLS LAST, p.id ASC
      LIMIT ${params.limit}
      OFFSET ${params.offset}
    `);
    fleetRows = rows.rows;
  } catch {
    // PostGIS unavailable — query without spatial functions
    const rows = await db.execute<FleetRow & { location_wkt: string | null }>(sql`
      SELECT
        p.id AS "partnerId",
        p.full_name AS "fullName",
        COALESCE(pl.is_online, false) AS "isOnline",
        pl.last_seen_at AS "lastSeenAt",
        pl.location::text AS location_wkt,
        pl.heading AS heading,
        ab.id AS "bookingId",
        ab.booking_number AS "bookingNumber",
        ab.status AS "bookingStatus"
      FROM partners p
      INNER JOIN users u ON u.id = p.id
      LEFT JOIN partner_locations pl ON pl.partner_id = p.id
      LEFT JOIN LATERAL (
        SELECT b.id, b.booking_number, b.status
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN ('PROFESSIONAL_EN_ROUTE', 'CHECKED_IN', 'IN_PROGRESS')
        ORDER BY b.updated_at DESC
        LIMIT 1
      ) ab ON true
      WHERE p.approval_status = 'APPROVED'
      ORDER BY p.full_name ASC NULLS LAST, p.id ASC
      LIMIT ${params.limit}
      OFFSET ${params.offset}
    `);
    fleetRows = rows.rows.map((r) => {
      const parsed = parsePointWkt(r.location_wkt);
      return { ...r, latitude: parsed?.lat ?? null, longitude: parsed?.lng ?? null };
    });
  }

  const countResult = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM partners
    WHERE approval_status = 'APPROVED'
  `);

  return {
    partners: fleetRows.map(mapRow),
    total: Number(countResult.rows[0]?.count ?? 0),
  };
};

export const getPartnerOperationalStatus = async (
  partnerId: string,
): Promise<PartnerOperationalSnapshot | null> => {
  let fleetRow: FleetRow | undefined;
  try {
    const rows = await db.execute<FleetRow>(sql`
      SELECT
        p.id AS "partnerId",
        p.full_name AS "fullName",
        COALESCE(pl.is_online, false) AS "isOnline",
        pl.last_seen_at AS "lastSeenAt",
        ST_Y(pl.location::geometry) AS latitude,
        ST_X(pl.location::geometry) AS longitude,
        pl.heading AS heading,
        ab.id AS "bookingId",
        ab.booking_number AS "bookingNumber",
        ab.status AS "bookingStatus"
      FROM partners p
      LEFT JOIN partner_locations pl ON pl.partner_id = p.id
      LEFT JOIN LATERAL (
        SELECT b.id, b.booking_number, b.status
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN ('PROFESSIONAL_EN_ROUTE', 'CHECKED_IN', 'IN_PROGRESS')
        ORDER BY b.updated_at DESC
        LIMIT 1
      ) ab ON true
      WHERE p.id = ${partnerId}
      LIMIT 1
    `);
    fleetRow = rows.rows[0];
  } catch {
    // PostGIS unavailable
    const rows = await db.execute<FleetRow & { location_wkt: string | null }>(sql`
      SELECT
        p.id AS "partnerId",
        p.full_name AS "fullName",
        COALESCE(pl.is_online, false) AS "isOnline",
        pl.last_seen_at AS "lastSeenAt",
        pl.location::text AS location_wkt,
        pl.heading AS heading,
        ab.id AS "bookingId",
        ab.booking_number AS "bookingNumber",
        ab.status AS "bookingStatus"
      FROM partners p
      LEFT JOIN partner_locations pl ON pl.partner_id = p.id
      LEFT JOIN LATERAL (
        SELECT b.id, b.booking_number, b.status
        FROM bookings b
        WHERE b.partner_id = p.id
          AND b.status IN ('PROFESSIONAL_EN_ROUTE', 'CHECKED_IN', 'IN_PROGRESS')
        ORDER BY b.updated_at DESC
        LIMIT 1
      ) ab ON true
      WHERE p.id = ${partnerId}
      LIMIT 1
    `);
    const r = rows.rows[0];
    if (r) {
      const parsed = parsePointWkt(r.location_wkt);
      fleetRow = { ...r, latitude: parsed?.lat ?? null, longitude: parsed?.lng ?? null };
    }
  }

  return fleetRow ? mapRow(fleetRow) : null;
};

const lastEmitAt = new Map<string, number>();
const EMIT_THROTTLE_MS = 30_000;

export const emitPartnerOperationalStatus = async (
  partnerId: string,
  opts?: { force?: boolean },
): Promise<void> => {
  const last = lastEmitAt.get(partnerId) ?? 0;
  if (!opts?.force && Date.now() - last < EMIT_THROTTLE_MS) return;

  const snapshot = await getPartnerOperationalStatus(partnerId);
  if (!snapshot) return;

  lastEmitAt.set(partnerId, Date.now());
  bookingEvents.emitPartnerOperationalStatus(snapshot);
};

/**
 * Mark partners offline when last_seen is stale; emit status updates.
 */
export const sweepStaleOnlinePartners = async (): Promise<number> => {
  const result = await db.execute<{ partner_id: string }>(sql`
    UPDATE partner_locations
    SET is_online = false, updated_at = now()
    WHERE is_online = true
      AND last_seen_at < now() - interval '5 minutes'
    RETURNING partner_id
  `);

  for (const row of result.rows) {
    await emitPartnerOperationalStatus(row.partner_id, { force: true });
  }

  return result.rows.length;
};

/** @internal */
export const _testing = {
  deriveStatus,
  ACTIVE_JOB_STATUSES,
  clearThrottle: () => lastEmitAt.clear(),
};
