import {
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import { ensurePartnerDispatchReady } from "../partners/dispatchBootstrap.ts";
import * as repo from "./repository.ts";

export const assignZones = async (
  partnerId: string,
  zoneIds: string[],
  primaryZoneId?: string,
) => {
  if (!(await repo.partnerExists(partnerId))) {
    throw new NotFoundError("Partner not found.");
  }

  for (const zoneId of zoneIds) {
    if (!(await repo.zoneExists(zoneId))) {
      throw new NotFoundError(`Zone ${zoneId} not found.`);
    }
  }

  if (primaryZoneId && !zoneIds.includes(primaryZoneId)) {
    throw new BadRequestError(
      "primaryZoneId must be included in zoneIds.",
    );
  }

  return await repo.assignZones(partnerId, zoneIds, primaryZoneId);
};

export const removeZone = async (partnerId: string, zoneId: string) => {
  if (!(await repo.partnerExists(partnerId))) {
    throw new NotFoundError("Partner not found.");
  }
  await repo.removeZone(partnerId, zoneId);
};

export const setPrimaryZone = async (partnerId: string, zoneId: string) => {
  if (!(await repo.partnerExists(partnerId))) {
    throw new NotFoundError("Partner not found.");
  }
  await repo.setPrimaryZone(partnerId, zoneId);
};

export const getPartnerZones = async (partnerId: string) => {
  if (!(await repo.partnerExists(partnerId))) {
    throw new NotFoundError("Partner not found.");
  }
  return await repo.getPartnerZones(partnerId);
};

export const updatePartnerBaseLocation = async (
  partnerId: string,
  latitude: number,
  longitude: number,
) => {
  if (!(await repo.partnerExists(partnerId))) {
    throw new NotFoundError("Partner not found.");
  }
  await repo.updatePartnerBaseLocation(partnerId, longitude, latitude);
  await ensurePartnerDispatchReady(partnerId, {
    latitude,
    longitude,
    markOnline: true,
  });
};
