import { and, eq } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  partnerZones,
  partners,
  serviceZones,
} from "../../../db/schema.ts";

export type PartnerZoneRecord = typeof partnerZones.$inferSelect;

export type PartnerZoneWithDetails = PartnerZoneRecord & {
  zoneCity: string;
  zoneName: string;
  zoneSlug: string;
};

export const assignZones = async (
  partnerId: string,
  zoneIds: string[],
  primaryZoneId?: string,
): Promise<PartnerZoneRecord[]> => {
  if (zoneIds.length === 0) return [];

  const values = zoneIds.map((zoneId) => ({
    isPrimary: zoneId === primaryZoneId,
    partnerId,
    zoneId,
  }));

  return await db
    .insert(partnerZones)
    .values(values)
    .onConflictDoNothing({
      target: [partnerZones.partnerId, partnerZones.zoneId],
    })
    .returning();
};

export const removeZone = async (
  partnerId: string,
  zoneId: string,
): Promise<void> => {
  await db
    .delete(partnerZones)
    .where(
      and(
        eq(partnerZones.partnerId, partnerId),
        eq(partnerZones.zoneId, zoneId),
      ),
    );
};

export const setPrimaryZone = async (
  partnerId: string,
  zoneId: string,
): Promise<void> => {
  await db
    .update(partnerZones)
    .set({ isPrimary: false })
    .where(eq(partnerZones.partnerId, partnerId));

  await db
    .update(partnerZones)
    .set({ isPrimary: true })
    .where(
      and(
        eq(partnerZones.partnerId, partnerId),
        eq(partnerZones.zoneId, zoneId),
      ),
    );
};

export const getPartnerZones = async (
  partnerId: string,
): Promise<PartnerZoneWithDetails[]> => {
  const rows = await db
    .select({
      isPrimary: partnerZones.isPrimary,
      partnerId: partnerZones.partnerId,
      zoneCity: serviceZones.city,
      zoneId: partnerZones.zoneId,
      zoneName: serviceZones.name,
      zoneSlug: serviceZones.slug,
      createdAt: partnerZones.createdAt,
      updatedAt: partnerZones.updatedAt,
    })
    .from(partnerZones)
    .innerJoin(serviceZones, eq(partnerZones.zoneId, serviceZones.id))
    .where(eq(partnerZones.partnerId, partnerId));

  return rows.map((r) => ({
    createdAt: r.createdAt,
    isPrimary: r.isPrimary,
    partnerId: r.partnerId,
    updatedAt: r.updatedAt,
    zoneCity: r.zoneCity,
    zoneId: r.zoneId,
    zoneName: r.zoneName,
    zoneSlug: r.zoneSlug,
  }));
};

export const partnerExists = async (partnerId: string): Promise<boolean> => {
  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  return Boolean(row);
};

export const zoneExists = async (zoneId: string): Promise<boolean> => {
  const [row] = await db
    .select({ id: serviceZones.id })
    .from(serviceZones)
    .where(eq(serviceZones.id, zoneId))
    .limit(1);
  return Boolean(row);
};

export const updatePartnerBaseLocation = async (
  partnerId: string,
  longitude: number,
  latitude: number,
): Promise<void> => {
  await db
    .update(partners)
    .set({
      baseLocation: `SRID=4326;POINT(${longitude} ${latitude})`,
    })
    .where(eq(partners.id, partnerId));
};
