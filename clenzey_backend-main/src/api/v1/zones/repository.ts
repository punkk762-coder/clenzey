import { HttpStatusCode } from "axios";
import { and, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  serviceZones,
  serviceZoneServices,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import {
  type MultiPolygon as MultiPolygonCoords,
  isPointInMultiPolygon,
  parseWktMultiPolygon,
} from "../../../utilities/geoUtils.ts";
import logger from "../../../configs/loggerConfig.ts";

export type ZoneRecord = typeof serviceZones.$inferSelect;
export type ZoneInsert = typeof serviceZones.$inferInsert;
export type ZoneServiceRecord = typeof serviceZoneServices.$inferSelect;

type ZoneWriteInput = Omit<ZoneInsert, "boundary"> & {
  boundary: MultiPolygonCoords;
};

const buildBoundarySql = (boundary: MultiPolygonCoords) => {
  const geojson = JSON.stringify({ coordinates: boundary, type: "MultiPolygon" });
  return sql`ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography`;
};

export const insertZone = async (input: ZoneWriteInput): Promise<ZoneRecord> => {
  const { boundary, ...rest } = input;
  const [row] = await db
    .insert(serviceZones)
    .values({
      ...rest,
      boundary: buildBoundarySql(boundary) as unknown as string,
    })
    .returning();
  if (!row) {
    throw new AppError("Failed to create zone", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const updateZone = async (
  id: string,
  patch: Partial<Omit<ZoneInsert, "boundary">> & { boundary?: MultiPolygonCoords },
): Promise<ZoneRecord> => {
  const { boundary, ...rest } = patch;
  const values: Partial<ZoneInsert> = { ...rest };
  if (boundary) {
    (values as Record<string, unknown>)["boundary"] = buildBoundarySql(boundary);
  }
  const [row] = await db
    .update(serviceZones)
    .set(values)
    .where(eq(serviceZones.id, id))
    .returning();
  if (!row) {
    throw new AppError("Failed to update zone", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const findZoneById = async (id: string): Promise<null | ZoneRecord> => {
  const [row] = await db
    .select()
    .from(serviceZones)
    .where(eq(serviceZones.id, id))
    .limit(1);
  return row ?? null;
};

export const findZoneBySlug = async (
  slug: string,
): Promise<null | ZoneRecord> => {
  const [row] = await db
    .select()
    .from(serviceZones)
    .where(eq(serviceZones.slug, slug))
    .limit(1);
  return row ?? null;
};

export const listZones = async (filter: {
  city?: string;
  limit?: number;
  offset?: number;
  status?: "ACTIVE" | "DRAFT" | "INACTIVE";
}): Promise<ZoneRecord[]> => {
  const conditions = [];
  if (filter.city) conditions.push(eq(serviceZones.city, filter.city));
  if (filter.status) conditions.push(eq(serviceZones.status, filter.status));
  const where = conditions.length ? and(...conditions) : undefined;
  return await db
    .select()
    .from(serviceZones)
    .where(where)
    .orderBy(sql`${serviceZones.priority} DESC`, serviceZones.name)
    .limit(filter.limit ?? 100)
    .offset(filter.offset ?? 0);
};

export const deleteZone = async (id: string): Promise<void> => {
  await db.delete(serviceZones).where(eq(serviceZones.id, id));
};

/**
 * Returns active zones that contain the given (lng, lat), ordered by priority desc.
 * Uses the GIST index on service_zones.boundary.
 */
export const findZonesContainingPoint = async (
  latitude: number,
  longitude: number,
): Promise<ZoneRecord[]> => {
  try {
    const result = await db.execute<ZoneRecord>(sql`
      SELECT *
      FROM service_zones
      WHERE status = 'ACTIVE'
        AND ST_Covers(
          boundary,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        )
      ORDER BY priority DESC, name ASC
    `);
    return result.rows;
  } catch {
    logger.warn("PostGIS unavailable — falling back to in-memory zone check");
  }

  const allActive = await db
    .select()
    .from(serviceZones)
    .where(eq(serviceZones.status, "ACTIVE"));

  return allActive.filter((zone) => {
    if (!zone.boundary) return true;
    const coords = parseWktMultiPolygon(zone.boundary as string);
    if (coords.length === 0) return true;
    return isPointInMultiPolygon([longitude, latitude], coords);
  });
};

/**
 * Returns active zones within `radiusMeters` of the given point, ordered by distance.
 */
export const findNearbyZones = async (
  latitude: number,
  longitude: number,
  radiusMeters: number,
  limit = 10,
): Promise<{ distanceMeters: number; zone: ZoneRecord }[]> => {
  try {
    const result = await db.execute<ZoneRecord & { distance_meters: number }>(sql`
      SELECT z.*,
             ST_Distance(
               z.boundary,
               ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
             ) AS distance_meters
      FROM service_zones z
      WHERE z.status = 'ACTIVE'
        AND ST_DWithin(
          z.boundary,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY distance_meters ASC
      LIMIT ${limit}
    `);
    return result.rows.map((r) => {
      const { distance_meters, ...zone } = r;
      return {
        distanceMeters: Math.round(Number(distance_meters)),
        zone: zone as ZoneRecord,
      };
    });
  } catch {
    logger.warn("PostGIS unavailable — falling back to all active zones");
  }

  const allActive = await db
    .select()
    .from(serviceZones)
    .where(eq(serviceZones.status, "ACTIVE"))
    .limit(limit);

  return allActive.map((zone) => ({ distanceMeters: 0, zone }));
};

// ── Zone ↔ Service mapping ──────────────────────────────────────────────

export const setZoneServices = async (
  zoneId: string,
  serviceIds: string[],
): Promise<ZoneServiceRecord[]> => {
  return await db.transaction(async (tx) => {
    await tx
      .delete(serviceZoneServices)
      .where(eq(serviceZoneServices.zoneId, zoneId));
    if (!serviceIds.length) return [];
    return await tx
      .insert(serviceZoneServices)
      .values(
        serviceIds.map((serviceId) => ({
          isAvailable: true,
          serviceId,
          zoneId,
        })),
      )
      .returning();
  });
};

export const listZoneServices = async (
  zoneId: string,
): Promise<ZoneServiceRecord[]> => {
  return await db
    .select()
    .from(serviceZoneServices)
    .where(eq(serviceZoneServices.zoneId, zoneId));
};

export const isServiceAvailableInZone = async (
  zoneId: string,
  serviceId: string,
): Promise<boolean> => {
  const [row] = await db
    .select()
    .from(serviceZoneServices)
    .where(
      and(
        eq(serviceZoneServices.zoneId, zoneId),
        eq(serviceZoneServices.serviceId, serviceId),
        eq(serviceZoneServices.isAvailable, true),
      ),
    )
    .limit(1);
  return Boolean(row);
};

export const getZoneBoundaryGeoJSON = async (
  id: string,
): Promise<null | string> => {
  try {
    const result = await db.execute<{ geojson: string }>(sql`
      SELECT ST_AsGeoJSON(boundary) AS geojson FROM service_zones WHERE id = ${id} LIMIT 1
    `);
    return result.rows[0]?.geojson ?? null;
  } catch {
    // PostGIS unavailable — return raw boundary as fallback
    const [zone] = await db.select().from(serviceZones).where(eq(serviceZones.id, id)).limit(1);
    return zone?.boundary ? String(zone.boundary) : null;
  }
};
