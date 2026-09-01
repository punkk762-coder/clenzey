import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const updatePlatformPricingBody = z
  .object({
    effectiveFrom: z.iso.datetime().optional(),
    gstRate: z.number().min(0).max(100).optional(),
    platformFeeFlat: z.number().min(0).max(100000).optional(),
    platformFeePercent: z.number().min(0).max(100).optional(),
  })
  .refine(
    (data) =>
      data.gstRate !== undefined ||
      data.platformFeeFlat !== undefined ||
      data.platformFeePercent !== undefined,
    {
      message:
        "At least one of gstRate, platformFeeFlat, or platformFeePercent is required.",
    },
  );

const listHistoryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const updatePlatformPricingRequest: RequestHandler = (
  req,
  _res,
  next,
) => {
  req.body = runZod(updatePlatformPricingBody, req.body);
  next();
};

export const listHistoryRequest: RequestHandler = (req, _res, next) => {
  const query = runZod(listHistoryQuery, req.query);
  (req as unknown as { validatedQuery: typeof query }).validatedQuery = query;
  next();
};
