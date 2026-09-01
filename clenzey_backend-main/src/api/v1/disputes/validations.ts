import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
] as const;

const createDisputeBody = z.object({
  bookingId: z.string().uuid(),
  category: z.enum([
    "SERVICE_QUALITY",
    "PRICING",
    "DAMAGE",
    "NO_SHOW",
    "OTHER",
  ]),
  description: z.string().min(10).max(2000),
});

const updateDisputeBody = z.object({
  resolutionNotes: z.string().max(2000).optional(),
  status: z.enum(["UNDER_REVIEW", "RESOLVED", "CLOSED"]),
});

const listDisputesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.enum(DISPUTE_STATUSES).optional(),
});

const adminListDisputesQuery = z.object({
  bookingId: z.string().uuid().optional(),
  category: z
    .enum(["SERVICE_QUALITY", "PRICING", "DAMAGE", "NO_SHOW", "OTHER"])
    .optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.enum(DISPUTE_STATUSES).optional(),
});

const addDisputeEvidenceBody = z.object({
  fileUrl: z.string().url(),
});

export const addDisputeEvidenceRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(addDisputeEvidenceBody, req.body);
  next();
};

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const createDisputeRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createDisputeBody, req.body);
  next();
};

export const updateDisputeRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateDisputeBody, req.body);
  next();
};

export const listDisputesRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(listDisputesQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const adminListDisputesRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(adminListDisputesQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

const disputeIdParam = z.object({
  id: z.string().uuid(),
});

const bookingIdParam = z.object({
  bookingId: z.string().uuid(),
});

export const validateDisputeIdParam: RequestHandler = (req, _res, next) => {
  runZod(disputeIdParam, req.params);
  next();
};

export const validateBookingIdParam: RequestHandler = (req, _res, next) => {
  runZod(bookingIdParam, req.params);
  next();
};
