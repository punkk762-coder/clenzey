import type { RequestHandler } from "express";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as dispatchAdminService from "./adminService.ts";
import { parseSyncQuery } from "./validations.ts";

export const listFailedJobs: RequestHandler = tryCatchUtil(async (req, res) => {
  const limit = req.query["limit"]
    ? Number(req.query["limit"])
    : undefined;
  const offset = req.query["offset"]
    ? Number(req.query["offset"])
    : undefined;
  const queue =
    typeof req.query["queue"] === "string" ? req.query["queue"] : undefined;

  const result = await dispatchAdminService.listFailedJobs({
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
    ...(queue ? { queue } : {}),
  });

  return sendResponse(res, { data: result });
});

export const retryFailedJob: RequestHandler = tryCatchUtil(async (req, res) => {
  const queueName = req.params["queueName"] as string;
  const jobId = req.params["jobId"] as string;
  const job = await dispatchAdminService.retryFailedJob(queueName, jobId);
  return sendResponse(res, { data: { job } });
});

export const listEscalatedBookings: RequestHandler = tryCatchUtil(
  async (_req, res) => {
    const bookings = await dispatchAdminService.listEscalatedBookings();
    return sendResponse(res, { data: { bookings } });
  },
);

export const triggerInstantDispatch: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const adminId = req.user?.sub;
    if (!adminId) throw new UnauthorizedError();
    const bookingId = req.params["bookingId"] as string;
    const result = await dispatchAdminService.triggerInstantDispatch(
      bookingId,
      adminId,
      parseSyncQuery(req.query),
    );
    return sendResponse(res, { data: result });
  },
);

export const triggerRedispatch: RequestHandler = tryCatchUtil(async (req, res) => {
  const adminId = req.user?.sub;
  if (!adminId) throw new UnauthorizedError();
  const bookingId = req.params["bookingId"] as string;
  const body = (req.body ?? {}) as { radiusMeters?: number };
  const result = await dispatchAdminService.triggerRedispatch(
    bookingId,
    adminId,
    {
      ...(body.radiusMeters !== undefined
        ? { radiusMeters: body.radiusMeters }
        : {}),
      sync: parseSyncQuery(req.query),
    },
  );
  return sendResponse(res, { data: result });
});

export const triggerScheduledAssign: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const adminId = req.user?.sub;
    if (!adminId) throw new UnauthorizedError();
    const bookingId = req.params["bookingId"] as string;
    const result = await dispatchAdminService.triggerScheduledAssign(
      bookingId,
      adminId,
      parseSyncQuery(req.query),
    );
    return sendResponse(res, { data: result });
  },
);

export const triggerRevalidate: RequestHandler = tryCatchUtil(async (req, res) => {
  const adminId = req.user?.sub;
  if (!adminId) throw new UnauthorizedError();
  const bookingId = req.params["bookingId"] as string;
  const result = await dispatchAdminService.triggerRevalidate(
    bookingId,
    adminId,
    parseSyncQuery(req.query),
  );
  return sendResponse(res, { data: result });
});

export const triggerScheduledBatch: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const adminId = req.user?.sub;
    if (!adminId) throw new UnauthorizedError();
    const result = await dispatchAdminService.triggerScheduledBatch(
      adminId,
      parseSyncQuery(req.query),
    );
    return sendResponse(res, { data: result });
  },
);
