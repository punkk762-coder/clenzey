import {
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import { domainEvents } from "../../../realtime/domainEvents.ts";
import {
  type MultiPolygon as MultiPolygonCoords,
  validateMultiPolygonCoords,
} from "../../../utilities/geoUtils.ts";
import { recomputeServiceabilityForAffectedAddresses } from "../addresses/service.ts";
import * as servicesRepo from "../services/repository.ts";
import * as repo from "./repository.ts";

/**
 * Fire-and-forget recompute of address serviceability after a zone mutation.
 * Runs asynchronously so the caller's response isn't blocked; per-consumer
 * `address:updated` events propagate as rows actually change.
 */
const queueServiceabilityRecompute = (): void => {
  void recomputeServiceabilityForAffectedAddresses().catch(() => {
    // Log handled in the underlying repo errors; swallow here so a recompute
    // failure never breaks the original zone mutation response.
  });
};

export type ZoneStatus = "ACTIVE" | "DRAFT" | "INACTIVE";
export type ZoneTier = "CORPORATE_ONLY" | "PREMIUM" | "STANDARD";

type ZoneCreateInput = {
  boundary: MultiPolygonCoords;
  centerLat?: number;
  centerLng?: number;
  city: string;
  country?: string;
  description?: string;
  name: string;
  priority?: number;
  serviceIds?: string[];
  slug: string;
  state: string;
  status?: ZoneStatus;
  surgeMultiplier?: number;
  tier?: ZoneTier;
};

type ZoneUpdateInput = Partial<Omit<ZoneCreateInput, "serviceIds">> & {
  serviceIds?: string[];
};

const assertValidBoundary = (boundary: MultiPolygonCoords) => {
  const err = validateMultiPolygonCoords(boundary);
  if (err) throw new BadRequestError(err);
};

export const createZone = async (input: ZoneCreateInput) => {
  assertValidBoundary(input.boundary);
  const existing = await repo.findZoneBySlug(input.slug);
  if (existing) {
    throw new BadRequestError(`A zone with slug "${input.slug}" already exists.`);
  }

  const created = await repo.insertZone({
    boundary: input.boundary,
    ...(input.centerLat !== undefined && { centerLat: String(input.centerLat) }),
    ...(input.centerLng !== undefined && { centerLng: String(input.centerLng) }),
    city: input.city,
    country: input.country ?? "India",
    ...(input.description !== undefined && { description: input.description }),
    name: input.name,
    priority: input.priority ?? 0,
    slug: input.slug,
    state: input.state,
    status: input.status ?? "ACTIVE",
    ...(input.surgeMultiplier !== undefined && {
      surgeMultiplier: String(input.surgeMultiplier),
    }),
    tier: input.tier ?? "STANDARD",
  });

  // If no serviceIds provided, link all active services automatically.
  const serviceIds = input.serviceIds ??
    (await servicesRepo.listActiveServices()).map((s) => s.id);
  if (serviceIds.length > 0) {
    await repo.setZoneServices(created.id, serviceIds);
  }
  domainEvents.emitZoneCreated({
    timestamp: new Date().toISOString(),
    zone: created as unknown as Record<string, unknown>,
  });
  queueServiceabilityRecompute();
  return created;
};

export const updateZone = async (id: string, patch: ZoneUpdateInput) => {
  const existing = await repo.findZoneById(id);
  if (!existing) throw new NotFoundError("Zone not found.");

  if (patch.boundary) assertValidBoundary(patch.boundary);
  if (patch.slug && patch.slug !== existing.slug) {
    const conflict = await repo.findZoneBySlug(patch.slug);
    if (conflict) {
      throw new BadRequestError(
        `A zone with slug "${patch.slug}" already exists.`,
      );
    }
  }

  const updated = await repo.updateZone(id, {
    ...(patch.boundary && { boundary: patch.boundary }),
    ...(patch.centerLat !== undefined && { centerLat: String(patch.centerLat) }),
    ...(patch.centerLng !== undefined && { centerLng: String(patch.centerLng) }),
    ...(patch.city !== undefined && { city: patch.city }),
    ...(patch.country !== undefined && { country: patch.country }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.priority !== undefined && { priority: patch.priority }),
    ...(patch.slug !== undefined && { slug: patch.slug }),
    ...(patch.state !== undefined && { state: patch.state }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.surgeMultiplier !== undefined && {
      surgeMultiplier: String(patch.surgeMultiplier),
    }),
    ...(patch.tier !== undefined && { tier: patch.tier }),
  });

  if (patch.serviceIds !== undefined) {
    await repo.setZoneServices(id, patch.serviceIds);
  }
  if (updated) {
    domainEvents.emitZoneUpdated({
      timestamp: new Date().toISOString(),
      zone: updated as unknown as Record<string, unknown>,
    });
    queueServiceabilityRecompute();
  }
  return updated;
};

export const deleteZone = async (id: string): Promise<void> => {
  const existing = await repo.findZoneById(id);
  if (!existing) throw new NotFoundError("Zone not found.");
  await repo.deleteZone(id);
  domainEvents.emitZoneDeleted({
    timestamp: new Date().toISOString(),
    zoneId: id,
  });
  queueServiceabilityRecompute();
};

export const listZones = async (filter: {
  city?: string;
  limit?: number;
  offset?: number;
  status?: ZoneStatus;
}) => {
  return await repo.listZones(filter);
};

export const getZone = async (id: string) => {
  const zone = await repo.findZoneById(id);
  if (!zone) throw new NotFoundError("Zone not found.");
  const services = await repo.listZoneServices(id);
  const boundaryGeoJSON = await repo.getZoneBoundaryGeoJSON(id);
  return {
    ...zone,
    boundaryGeoJSON: boundaryGeoJSON ? JSON.parse(boundaryGeoJSON) : null,
    services,
  };
};

export const checkServiceability = async (
  latitude: number,
  longitude: number,
  serviceId?: string,
): Promise<{
  isServiceable: boolean;
  reason?: string;
  zone?: { id: string; name: string; tier: string };
}> => {
  const zones = await repo.findZonesContainingPoint(latitude, longitude);
  if (!zones.length) {
    return {
      isServiceable: false,
      reason: "We don't currently serve this location.",
    };
  }
  const zone = zones[0]!;
  if (serviceId) {
    const ok = await repo.isServiceAvailableInZone(zone.id, serviceId);
    if (!ok) {
      return {
        isServiceable: false,
        reason: "This service isn't available in this zone yet.",
        zone: { id: zone.id, name: zone.name, tier: zone.tier },
      };
    }
  }
  return {
    isServiceable: true,
    zone: { id: zone.id, name: zone.name, tier: zone.tier },
  };
};

export const nearbyZones = async (
  latitude: number,
  longitude: number,
  radiusMeters = 15000,
) => {
  return await repo.findNearbyZones(latitude, longitude, radiusMeters);
};
