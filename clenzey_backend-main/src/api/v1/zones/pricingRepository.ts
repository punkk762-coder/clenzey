import { and, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { serviceZones, zonePriceOverrides } from "../../../db/schema.ts";
import { findZonesContainingPoint } from "./repository.ts";

export type ZonePriceOverrideRecord = typeof zonePriceOverrides.$inferSelect;
export type ZonePriceOverrideInsert = typeof zonePriceOverrides.$inferInsert;

/** Raw row shape returned by `db.execute` (Postgres snake_case columns). */
type ZonePriceOverrideSqlRow = {
  id: string;
  zone_id: string;
  service_id: string;
  variant_id: string;
  override_price: string;
  created_at: Date;
  updated_at: Date;
};

const mapOverrideSqlRow = (
  row: ZonePriceOverrideSqlRow,
): ZonePriceOverrideRecord => ({
  id: row.id,
  zoneId: row.zone_id,
  serviceId: row.service_id,
  variantId: row.variant_id,
  overridePrice: row.override_price,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Insert a new zone price override.
 */
export const insertOverride = async (
  input: Omit<ZonePriceOverrideInsert, "id">,
): Promise<ZonePriceOverrideRecord> => {
  const [row] = await db
    .insert(zonePriceOverrides)
    .values(input)
    .returning();
  if (!row) {
    throw new Error("Failed to insert zone price override");
  }
  return row;
};

/**
 * Update an existing zone price override by ID.
 */
export const updateOverride = async (
  id: string,
  patch: Partial<Pick<ZonePriceOverrideInsert, "overridePrice">>,
): Promise<ZonePriceOverrideRecord | null> => {
  const [row] = await db
    .update(zonePriceOverrides)
    .set(patch)
    .where(eq(zonePriceOverrides.id, id))
    .returning();
  return row ?? null;
};

/**
 * Delete a zone price override by ID.
 */
export const deleteOverride = async (id: string): Promise<boolean> => {
  const result = await db
    .delete(zonePriceOverrides)
    .where(eq(zonePriceOverrides.id, id))
    .returning({ id: zonePriceOverrides.id });
  return result.length > 0;
};

/**
 * List overrides, optionally filtered by zoneId, serviceId, or variantId.
 */
export const listOverrides = async (filter: {
  serviceId?: string;
  variantId?: string;
  zoneId?: string;
}): Promise<ZonePriceOverrideRecord[]> => {
  const conditions = [];
  if (filter.zoneId) conditions.push(eq(zonePriceOverrides.zoneId, filter.zoneId));
  if (filter.serviceId) conditions.push(eq(zonePriceOverrides.serviceId, filter.serviceId));
  if (filter.variantId) conditions.push(eq(zonePriceOverrides.variantId, filter.variantId));

  const where = conditions.length ? and(...conditions) : undefined;

  return await db
    .select()
    .from(zonePriceOverrides)
    .where(where)
    .orderBy(zonePriceOverrides.createdAt);
};

/**
 * Find a zone price override by its ID.
 */
export const findOverrideById = async (
  id: string,
): Promise<ZonePriceOverrideRecord | null> => {
  const [row] = await db
    .select()
    .from(zonePriceOverrides)
    .where(eq(zonePriceOverrides.id, id))
    .limit(1);
  return row ?? null;
};

/**
 * Find a specific override by zone, service, and variant combination.
 */
export const findOverrideByZoneServiceVariant = async (
  zoneId: string,
  serviceId: string,
  variantId: string,
): Promise<ZonePriceOverrideRecord | null> => {
  const [row] = await db
    .select()
    .from(zonePriceOverrides)
    .where(
      and(
        eq(zonePriceOverrides.zoneId, zoneId),
        eq(zonePriceOverrides.serviceId, serviceId),
        eq(zonePriceOverrides.variantId, variantId),
      ),
    )
    .limit(1);
  return row ?? null;
};

/**
 * Resolve the zone price override for a given point (lat, lng) + service + variant.
 *
 * Algorithm:
 * 1. Find all active zones whose boundary contains the point (using ST_Covers on geography).
 * 2. Select the zone with the highest priority value.
 * 3. Look up the zone_price_override for that zone + service + variant.
 * 4. Return the override record or null if no zone contains the point or no override exists.
 */
export const resolveOverrideForPoint = async (
  serviceId: string,
  variantId: string,
  latitude: number,
  longitude: number,
): Promise<ZonePriceOverrideRecord | null> => {
  try {
    const result = await db.execute<ZonePriceOverrideSqlRow>(sql`
      SELECT zpo.*
      FROM zone_price_overrides zpo
      INNER JOIN service_zones sz ON sz.id = zpo.zone_id
      WHERE sz.status = 'ACTIVE'
        AND ST_Covers(
          sz.boundary,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        )
        AND zpo.service_id = ${serviceId}
        AND zpo.variant_id = ${variantId}
      ORDER BY sz.priority DESC
      LIMIT 1
    `);
    const row = result.rows[0];
    return row ? mapOverrideSqlRow(row) : null;
  } catch {
    // PostGIS unavailable — use JS zone lookup fallback
    const zones = await findZonesContainingPoint(latitude, longitude);
    if (zones.length === 0) return null;
    for (const zone of zones) {
      const [override] = await db
        .select()
        .from(zonePriceOverrides)
        .where(
          and(
            eq(zonePriceOverrides.zoneId, zone.id),
            eq(zonePriceOverrides.serviceId, serviceId),
            eq(zonePriceOverrides.variantId, variantId),
          ),
        )
        .limit(1);
      if (override) return override;
    }
    return null;
  }
};
