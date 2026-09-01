import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as zonesService from "./service.ts";

export const createZone: RequestHandler = tryCatchUtil(async (req, res) => {
  const zone = await zonesService.createZone(req.body);
  return sendResponse(res, {
    data: { zone },
    statusCode: HttpStatusCode.Created,
  });
});

export const listZones: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (
    req as unknown as {
      validatedQuery: {
        city?: string;
        limit?: number;
        offset?: number;
        status?: "ACTIVE" | "DRAFT" | "INACTIVE";
      };
    }
  ).validatedQuery;
  const zones = await zonesService.listZones(q);
  return sendResponse(res, { data: { zones } });
});

export const getZone: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["zoneId"] as string;
  const zone = await zonesService.getZone(id);
  return sendResponse(res, { data: { zone } });
});

export const updateZone: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["zoneId"] as string;
  const zone = await zonesService.updateZone(id, req.body);
  return sendResponse(res, { data: { zone } });
});

export const deleteZone: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["zoneId"] as string;
  await zonesService.deleteZone(id);
  return sendResponse(res, { data: { id } });
});
