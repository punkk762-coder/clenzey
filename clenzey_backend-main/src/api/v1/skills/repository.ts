import { and, count, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { partners, partnerSkills, services, users } from "../../../db/schema.ts";

export type PartnerSkillRecord = typeof partnerSkills.$inferSelect;

export type PartnerSkillWithService = PartnerSkillRecord & {
  serviceName: string | null;
};

export type PartnerBySkillRecord = {
  avgRating: string | null;
  fullName: string | null;
  id: string;
  phone: string;
  profileImage: string | null;
  totalReviews: number;
};

// ─── Writes ───────────────────────────────────────────────────────

/**
 * Bulk-assign service skills to a partner.
 * Uses ON CONFLICT DO NOTHING to silently ignore duplicates.
 */
export const assignSkills = async (
  partnerId: string,
  serviceIds: string[],
): Promise<PartnerSkillRecord[]> => {
  if (serviceIds.length === 0) return [];

  const values = serviceIds.map((serviceId) => ({
    partnerId,
    serviceId,
  }));

  const records = await db
    .insert(partnerSkills)
    .values(values)
    .onConflictDoNothing({
      target: [partnerSkills.partnerId, partnerSkills.serviceId],
    })
    .returning();

  return records;
};

/**
 * Remove a single skill assignment from a partner.
 */
export const removeSkill = async (
  partnerId: string,
  serviceId: string,
): Promise<void> => {
  await db
    .delete(partnerSkills)
    .where(
      and(
        eq(partnerSkills.partnerId, partnerId),
        eq(partnerSkills.serviceId, serviceId),
      ),
    );
};

// ─── Reads ────────────────────────────────────────────────────────

/**
 * Get all skills for a partner, joined with services for the service name.
 */
export const getPartnerSkills = async (
  partnerId: string,
): Promise<PartnerSkillWithService[]> => {
  const rows = await db
    .select({
      skill: partnerSkills,
      serviceName: services.name,
    })
    .from(partnerSkills)
    .leftJoin(services, eq(partnerSkills.serviceId, services.id))
    .where(eq(partnerSkills.partnerId, partnerId));

  return rows.map((r) => ({
    ...r.skill,
    serviceName: r.serviceName ?? null,
  }));
};

/**
 * List all partners that have a specific service skill (paginated).
 */
export const listPartnersBySkill = async (
  serviceId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ partners: PartnerBySkillRecord[]; total: number }> => {
  const { limit = 50, offset = 0 } = opts;

  const [totalResult] = await db
    .select({ count: count() })
    .from(partnerSkills)
    .where(eq(partnerSkills.serviceId, serviceId));

  const total = totalResult?.count ?? 0;

  const rows = await db
    .select({
      avgRating: partners.avgRating,
      fullName: partners.fullName,
      id: partners.id,
      phone: users.phone,
      profileImage: partners.profileImage,
      totalReviews: partners.totalReviews,
    })
    .from(partnerSkills)
    .innerJoin(partners, eq(partnerSkills.partnerId, partners.id))
    .innerJoin(users, eq(partners.id, users.id))
    .where(eq(partnerSkills.serviceId, serviceId))
    .limit(limit)
    .offset(offset);

  return { partners: rows, total };
};
