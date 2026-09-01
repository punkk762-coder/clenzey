import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as slotsService from "./service.ts";

export const generateSlots: RequestHandler = tryCatchUtil(async (req, res) => {
  const result = await slotsService.generateSlots(req.body);
  return sendResponse(res, {
    data: result,
    statusCode: HttpStatusCode.Created,
  });
});

export const listAvailableSlots: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const q = (req as unknown as {
      validatedQuery: { date: string; serviceId: string };
    }).validatedQuery;
    const slots = await slotsService.listAvailableSlots(q.serviceId, q.date);
    return sendResponse(res, { data: { slots } });
  },
);

export const listAdminSlots: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (req as unknown as {
    validatedQuery: { fromAt: string; serviceId: string; toAt: string };
  }).validatedQuery;
  const slots = await slotsService.listSlotsForAdmin(
    q.serviceId,
    q.fromAt,
    q.toAt,
  );
  return sendResponse(res, { data: { slots } });
});

export const updateSlotCapacity: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const slotId = req.params["slotId"] as string;
    const slot = await slotsService.updateCapacity(slotId, req.body.capacity);
    return sendResponse(res, { data: { slot } });
  },
);
