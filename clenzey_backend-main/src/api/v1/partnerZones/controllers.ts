import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as partnerZonesService from "./service.ts";

export const assignZones: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const { primaryZoneId, zoneIds } = req.body as {
    primaryZoneId?: string;
    zoneIds: string[];
  };
  const zones = await partnerZonesService.assignZones(
    partnerId,
    zoneIds,
    primaryZoneId,
  );
  return sendResponse(res, { data: { zones }, statusCode: HttpStatusCode.Created });
});

export const removeZone: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const zoneId = req.params["zoneId"] as string;
  await partnerZonesService.removeZone(partnerId, zoneId);
  return sendResponse(res, { data: { removed: true } });
});

export const setPrimaryZone: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const zoneId = req.params["zoneId"] as string;
  await partnerZonesService.setPrimaryZone(partnerId, zoneId);
  return sendResponse(res, { data: { primaryZoneId: zoneId } });
});

export const getPartnerZones: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const zones = await partnerZonesService.getPartnerZones(partnerId);
  return sendResponse(res, { data: { zones } });
});

export const getMyPartnerZones: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user!.sub;
  const zones = await partnerZonesService.getPartnerZones(partnerId);
  return sendResponse(res, { data: { zones } });
});

export const updateBaseLocation: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.params["id"] as string;
    const { latitude, longitude } = req.body as {
      latitude: number;
      longitude: number;
    };
    await partnerZonesService.updatePartnerBaseLocation(
      partnerId,
      latitude,
      longitude,
    );
    return sendResponse(res, { data: { updated: true } });
  },
);
