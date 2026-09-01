import { eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { bookingEta, partnerLocations } from "../../../db/schema.ts";
import { parsePointWkt } from "../../../utilities/geoUtils.ts";

export type BookingEtaRecord = typeof bookingEta.$inferSelect;
export type BookingEtaInsert = typeof bookingEta.$inferInsert;

/**
 * Upsert the ETA record for a booking. Since bookingId is the primary key,
 * we update all fields on conflict.
 */
export const upsertEta = async (
  data: BookingEtaInsert,
): Promise<BookingEtaRecord> => {
  const [record] = await db
    .insert(bookingEta)
    .values(data)
    .onConflictDoUpdate({
      target: bookingEta.bookingId,
      set: {
        distanceKm: data.distanceKm,
        etaMinutes: data.etaMinutes,
        lastPartnerLat: data.lastPartnerLat,
        lastPartnerLng: data.lastPartnerLng,
        updatedAt: new Date(),
      },
    })
    .returning();
  return record!;
};

/**
 * Get the stored ETA record for a booking.
 */
export const getEta = async (
  bookingId: string,
): Promise<BookingEtaRecord | null> => {
  const [record] = await db
    .select()
    .from(bookingEta)
    .where(eq(bookingEta.bookingId, bookingId))
    .limit(1);
  return record ?? null;
};

/**
 * Get the partner's current latitude and longitude from their last location record.
 * Uses PostGIS ST_Y (latitude) and ST_X (longitude) to extract from geography point.
 */
export const getPartnerLocation = async (
  partnerId: string,
): Promise<{ lastSeenAt: Date; latitude: number; longitude: number } | null> => {
  try {
    const result = await db.execute<{
      last_seen_at: Date;
      lat: number;
      lng: number;
    }>(sql`
      SELECT
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        last_seen_at
      FROM partner_locations
      WHERE partner_id = ${partnerId}
        AND location IS NOT NULL
      LIMIT 1
    `);
    const row = result.rows[0];
    if (row) return { lastSeenAt: new Date(row.last_seen_at), latitude: Number(row.lat), longitude: Number(row.lng) };
  } catch {
    // PostGIS unavailable — parse WKT directly
    const [row] = await db
      .select({ location: partnerLocations.location, lastSeenAt: partnerLocations.lastSeenAt })
      .from(partnerLocations)
      .where(eq(partnerLocations.partnerId, partnerId))
      .limit(1);
    if (row?.location && row.lastSeenAt) {
      const parsed = parsePointWkt(row.location as string);
      if (parsed) return { lastSeenAt: new Date(row.lastSeenAt), latitude: parsed.lat, longitude: parsed.lng };
    }
  }
  return null;
};
