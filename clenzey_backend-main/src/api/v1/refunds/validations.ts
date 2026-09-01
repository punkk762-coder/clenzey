import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const initiateRefundBody = z.object({
  amount: z.number().positive(),
  bookingId: z.uuid(),
  reason: z.string().max(1000).optional(),
});

const listRefundsQuery = z.object({
  bookingId: z.uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["INITIATED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const initiateRefundRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(initiateRefundBody, req.body);
  next();
};

export const listRefundsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(listRefundsQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};
