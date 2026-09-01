import type { RequestHandler } from "express";
import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";
import { isDispatchQueueName } from "../../../queues/dispatchQueueAdmin.ts";

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  return result.data;
};

const bookingIdParam = z.object({
  bookingId: z.string().uuid(),
});

const failedJobsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  queue: z
    .string()
    .refine((v) => isDispatchQueueName(v), "Invalid dispatch queue name")
    .optional(),
});

const retryJobParams = z.object({
  jobId: z.string().min(1),
  queueName: z
    .string()
    .refine((v) => isDispatchQueueName(v), "Invalid dispatch queue name"),
});

const redispatchBody = z.object({
  radiusMeters: z.number().int().min(1000).max(50000).optional(),
});

const parseSync = (query: Record<string, unknown>): boolean =>
  query["sync"] === "true" || query["sync"] === "1";

export const listFailedJobsRequest: RequestHandler = (req, _res, next) => {
  runZod(failedJobsQuery, req.query);
  next();
};

export const retryFailedJobRequest: RequestHandler = (req, _res, next) => {
  runZod(retryJobParams, req.params);
  next();
};

export const bookingDispatchRequest: RequestHandler = (req, _res, next) => {
  runZod(bookingIdParam, req.params);
  next();
};

export const redispatchRequest: RequestHandler = (req, _res, next) => {
  runZod(bookingIdParam, req.params);
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = runZod(redispatchBody, req.body);
  }
  next();
};

export const parseSyncQuery = parseSync;
