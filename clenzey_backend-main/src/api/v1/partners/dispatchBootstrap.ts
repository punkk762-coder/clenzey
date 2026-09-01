import { eq, sql } from "drizzle-orm";
import { parsePointWkt } from "../../../utilities/geoUtils.ts";

import db from "../../../db/index.ts";
import logger from "../../../configs/loggerConfig.ts";
import {
  partnerAvailability,
  partnerLocations,
  partners,
  services,
} from "../../../db/schema.ts";
import * as partnerZonesRepo from "../partnerZones/repository.ts";
import * as skillsRepo from "../skills/repository.ts";
import * as zonesRepo from "../zones/repository.ts";

const DEFAULT_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const geoPoint = (longitude: number, latitude: number) =>
  `SRID=4326;POINT(${longitude} ${latitude})`;

export const getPartnerBaseCoords = async (
  partnerId: string,
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const result = await db.execute<{ lat: number; lng: number }>(sql`
      SELECT
        ST_Y(base_location::geometry) AS lat,
        ST_X(base_location::geometry) AS lng
      FROM partners
      WHERE id = ${partnerId}
        AND base_location IS NOT NULL
      LIMIT 1
    `);
    const row = result.rows[0];
    if (row) return { latitude: Number(row.lat), longitude: Number(row.lng) };
  } catch {
    // PostGIS unavailable — parse WKT directly
    const [row] = await db
      .select({ baseLocation: partners.baseLocation })
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);
    if (row?.baseLocation) {
      const parsed = parsePointWkt(row.baseLocation as string);
      if (parsed) return { latitude: parsed.lat, longitude: parsed.lng };
    }
  }
  return null;
};

const ensureDefaultAvailability = async (partnerId: string): Promise<void> => {
  const existing = await db
    .select({ id: partnerAvailability.id })
    .from(partnerAvailability)
    .where(eq(partnerAvailability.partnerId, partnerId))
    .limit(1);

  if (existing.length > 0) return;

  for (const dayOfWeek of DEFAULT_DAYS) {
    await db
      .insert(partnerAvailability)
      .values({
        dayOfWeek,
        endHour: 22,
        isActive: true,
        partnerId,
        startHour: 8,
      })
      .onConflictDoNothing({
        target: [
          partnerAvailability.partnerId,
          partnerAvailability.dayOfWeek,
          partnerAvailability.startHour,
        ],
      });
  }
};

const ensureDefaultSkills = async (partnerId: string): Promise<void> => {
  const existing = await skillsRepo.getPartnerSkills(partnerId);
  if (existing.length > 0) return;

  const activeServices = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.isActive, true));

  if (activeServices.length === 0) return;

  await skillsRepo.assignSkills(
    partnerId,
    activeServices.map((s) => s.id),
  );
};

const syncDispatchLocation = async (
  partnerId: string,
  latitude: number,
  longitude: number,
  isOnline: boolean,
): Promise<void> => {
  await db
    .insert(partnerLocations)
    .values({
      isOnline,
      lastSeenAt: new Date(),
      location: geoPoint(longitude, latitude),
      partnerId,
    })
    .onConflictDoUpdate({
      set: {
        isOnline,
        lastSeenAt: new Date(),
        location: geoPoint(longitude, latitude),
      },
      target: partnerLocations.partnerId,
    });
};

/**
 * Ensures a partner has the minimum data required for auto-assignment:
 * zone membership, weekly availability, skills, and a dispatch location ping.
 */
export const ensurePartnerDispatchReady = async (
  partnerId: string,
  options: {
    latitude?: number;
    longitude?: number;
    markOnline?: boolean;
  } = {},
): Promise<void> => {
  const latitude =
    options.latitude ?? (await getPartnerBaseCoords(partnerId))?.latitude;
  const longitude =
    options.longitude ?? (await getPartnerBaseCoords(partnerId))?.longitude;

  if (latitude != null && longitude != null) {
    const zones = await zonesRepo.findZonesContainingPoint(latitude, longitude);
    if (zones[0]) {
      await partnerZonesRepo.assignZones(partnerId, [zones[0].id], zones[0].id);
    }
  }

  await ensureDefaultAvailability(partnerId);
  await ensureDefaultSkills(partnerId);

  if (latitude != null && longitude != null) {
    const [partner] = await db
      .select({ isAvailable: partners.isAvailable })
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);

    await syncDispatchLocation(
      partnerId,
      latitude,
      longitude,
      options.markOnline ?? partner?.isAvailable ?? false,
    );
  }

  logger.info("Partner dispatch bootstrap completed", {
    hasCoords: latitude != null && longitude != null,
    markOnline: options.markOnline ?? false,
    partnerId,
  });
};
