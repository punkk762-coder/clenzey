import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import { parseMoney } from "../../../utilities/moneyUtils.ts";
import * as servicesRepo from "../services/repository.ts";
import * as pricingRepo from "./pricingRepository.ts";
import * as zonesRepo from "./repository.ts";

// ─── Types ────────────────────────────────────────────────────────

export type ResolvedPrice = {
  basePrice: number;
  isOverride: boolean;
  zoneId: string | null;
};

export type CreateOverrideInput = {
  overridePrice: string;
  serviceId: string;
  variantId: string;
  zoneId: string;
};

export type UpdateOverrideInput = {
  overridePrice: string;
};

export type OverrideFilter = {
  serviceId?: string;
  variantId?: string;
  zoneId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Finds a variant (or sub-variant) by ID within a service's variants JSONB.
 * Returns the base price as a number, or null if not found.
 */
const findVariantBasePrice = (
  service: { variants: import("../../../db/schema.ts").ServiceVariantJson[] },
  variantId: string,
): number | null => {
  for (const variant of service.variants) {
    if (variant.id === variantId) {
      return Number(variant.basePrice);
    }
    if (variant.subVariants) {
      for (const sub of variant.subVariants) {
        if (sub.id === variantId) {
          return Number(sub.basePrice);
        }
      }
    }
  }
  return null;
};

// ─── Service Functions ────────────────────────────────────────────

/**
 * Resolve the base price for a service variant at a given location.
 *
 * If an override exists for the highest-priority zone containing the point,
 * returns the override price. Otherwise falls back to the global variant base price.
 */
export const resolveBasePrice = async (
  serviceId: string,
  variantId: string,
  latitude: number,
  longitude: number,
): Promise<ResolvedPrice> => {
  // Look up zone override for the point
  const override = await pricingRepo.resolveOverrideForPoint(
    serviceId,
    variantId,
    latitude,
    longitude,
  );

  if (override) {
    const basePrice = parseMoney(override.overridePrice);
    if (basePrice <= 0) {
      throw new BadRequestError(
        `Invalid zone price override for variant "${variantId}".`,
      );
    }

    return {
      basePrice,
      isOverride: true,
      zoneId: override.zoneId,
    };
  }

  // Fallback: get global variant base price from service definition
  const service = await servicesRepo.findServiceById(serviceId);
  if (!service) {
    throw new NotFoundError(`Service "${serviceId}" not found.`);
  }

  const variantPrice = findVariantBasePrice(service, variantId);
  if (variantPrice === null) {
    throw new NotFoundError(
      `Variant "${variantId}" not found in service "${serviceId}".`,
    );
  }

  return {
    basePrice: variantPrice,
    isOverride: false,
    zoneId: null,
  };
};

/**
 * Create a new zone price override.
 *
 * Validates:
 * - Zone exists
 * - Service exists and variant is valid
 * - No duplicate (zone + service + variant) combination
 */
export const createOverride = async (input: CreateOverrideInput) => {
  const { zoneId, serviceId, variantId, overridePrice } = input;

  // Validate zone exists
  const zone = await zonesRepo.findZoneById(zoneId);
  if (!zone) {
    throw new NotFoundError(`Zone "${zoneId}" not found.`);
  }

  // Validate service exists and variant is valid
  const service = await servicesRepo.findServiceById(serviceId);
  if (!service) {
    throw new BadRequestError(`Service "${serviceId}" not found.`);
  }

  const variantPrice = findVariantBasePrice(service, variantId);
  if (variantPrice === null) {
    throw new BadRequestError(
      `Variant "${variantId}" not found in service "${serviceId}".`,
    );
  }

  // Check for duplicate
  const existing = await pricingRepo.findOverrideByZoneServiceVariant(
    zoneId,
    serviceId,
    variantId,
  );
  if (existing) {
    throw new ConflictError(
      `A price override already exists for this zone-service-variant combination.`,
    );
  }

  return await pricingRepo.insertOverride({
    overridePrice,
    serviceId,
    variantId,
    zoneId,
  });
};

/**
 * Update an existing zone price override.
 */
export const updateOverride = async (id: string, input: UpdateOverrideInput) => {
  const existing = await pricingRepo.findOverrideById(id);
  if (!existing) {
    throw new NotFoundError(`Zone price override "${id}" not found.`);
  }

  const updated = await pricingRepo.updateOverride(id, {
    overridePrice: input.overridePrice,
  });

  if (!updated) {
    throw new NotFoundError(`Zone price override "${id}" not found.`);
  }

  return updated;
};

/**
 * Delete an existing zone price override.
 */
export const deleteOverride = async (id: string): Promise<void> => {
  const existing = await pricingRepo.findOverrideById(id);
  if (!existing) {
    throw new NotFoundError(`Zone price override "${id}" not found.`);
  }

  await pricingRepo.deleteOverride(id);
};

/**
 * List zone price overrides with optional filters.
 */
export const listOverrides = async (filter: OverrideFilter) => {
  return await pricingRepo.listOverrides(filter);
};
