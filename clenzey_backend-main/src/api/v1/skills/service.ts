import { NotFoundError } from "../../../errors/appErrors.ts";
import * as servicesRepo from "../services/repository.ts";
import * as partnersRepo from "../partners/repository.ts";
import * as repo from "./repository.ts";
import type {
  PartnerBySkillRecord,
  PartnerSkillRecord,
  PartnerSkillWithService,
} from "./repository.ts";

// ─── Assign Skills ────────────────────────────────────────────────

/**
 * Assign one or more service skills to a partner.
 * Validates that the partner and all services exist.
 * Duplicates are silently ignored (ON CONFLICT DO NOTHING).
 */
export const assignSkills = async (
  partnerId: string,
  serviceIds: string[],
): Promise<PartnerSkillRecord[]> => {
  // Validate partner exists
  const partner = await partnersRepo.findPartnerById(partnerId);
  if (!partner) {
    throw new NotFoundError("Partner not found.");
  }

  // Validate all services exist
  for (const serviceId of serviceIds) {
    const service = await servicesRepo.findServiceByIdIncludingInactive(serviceId);
    if (!service) {
      throw new NotFoundError(`Service not found: ${serviceId}`);
    }
  }

  return await repo.assignSkills(partnerId, serviceIds);
};

// ─── Remove Skill ─────────────────────────────────────────────────

/**
 * Remove a skill assignment from a partner.
 */
export const removeSkill = async (
  partnerId: string,
  serviceId: string,
): Promise<void> => {
  await repo.removeSkill(partnerId, serviceId);
};

// ─── Get Partner Skills ───────────────────────────────────────────

/**
 * Get all skills assigned to a partner (with service names).
 */
export const getPartnerSkills = async (
  partnerId: string,
): Promise<PartnerSkillWithService[]> => {
  return await repo.getPartnerSkills(partnerId);
};

// ─── List Partners by Skill ───────────────────────────────────────

/**
 * List all partners that have a specific service skill (paginated).
 */
export const listPartnersBySkill = async (
  serviceId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ partners: PartnerBySkillRecord[]; total: number }> => {
  return await repo.listPartnersBySkill(serviceId, opts);
};
