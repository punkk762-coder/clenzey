import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const submitReviewBody = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

const bookingReviewStatusParams = z.object({
  bookingId: z.string().uuid(),
});

const getPartnerReviewsParams = z.object({
  partnerId: z.string().uuid(),
});

const getPartnerReviewsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const adminReviewsQuery = z.object({
  consumerId: z.string().uuid().optional(),
  consumerName: z.string().trim().min(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  partnerId: z.string().uuid().optional(),
  partnerName: z.string().trim().min(1).optional(),
  ratingMax: z.coerce.number().int().min(1).max(5).optional(),
  ratingMin: z.coerce.number().int().min(1).max(5).optional(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const submitReviewRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(submitReviewBody, req.body);
  next();
};

export const getBookingReviewStatusRequest: RequestHandler = (
  req,
  _res,
  next,
) => {
  runZod(bookingReviewStatusParams, req.params);
  next();
};

export const getPartnerReviewsRequest: RequestHandler = (req, _res, next) => {
  runZod(getPartnerReviewsParams, req.params);
  const query = runZod(getPartnerReviewsQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};

export const adminReviewsRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(adminReviewsQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};
