import type { RequestHandler } from "express";

import z from "zod";

import { HttpStatusCode } from "axios";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails, sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as pricingService from "./pricingService.ts";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const overridePriceSchema = z
  .number()
  .min(1.0, "Override price must be at least 1.00")
  .max(999999.99, "Override price must not exceed 999999.99");

const createOverrideDto = z.object({
  serviceId: z.string().uuid("serviceId must be a valid UUID"),
  variantId: z.string().uuid("variantId must be a valid UUID"),
  overridePrice: overridePriceSchema,
});

const updateOverrideDto = z.object({
  overridePrice: overridePriceSchema,
});

// ─── Validation Helpers ───────────────────────────────────────────────────────

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  return result.data;
};

// ─── Validation Middleware ────────────────────────────────────────────────────

export const validateCreateOverride: RequestHandler = (req, _res, next) => {
  runZod(createOverrideDto, req.body);
  next();
};

export const validateUpdateOverride: RequestHandler = (req, _res, next) => {
  runZod(updateOverrideDto, req.body);
  next();
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const createOverride: RequestHandler = tryCatchUtil(async (req, res) => {
  const zoneId = req.params["zoneId"] as string;
  const { serviceId, variantId, overridePrice } = req.body as {
    serviceId: string;
    variantId: string;
    overridePrice: number;
  };

  const override = await pricingService.createOverride({
    zoneId,
    serviceId,
    variantId,
    overridePrice: overridePrice.toFixed(2),
  });

  return sendResponse(res, {
    data: { override },
    statusCode: HttpStatusCode.Created,
  });
});

export const listOverrides: RequestHandler = tryCatchUtil(async (req, res) => {
  const zoneId = req.params["zoneId"] as string;

  const overrides = await pricingService.listOverrides({ zoneId });

  return sendResponse(res, { data: { overrides } });
});

export const updateOverride: RequestHandler = tryCatchUtil(async (req, res) => {
  const overrideId = req.params["overrideId"] as string;
  const { overridePrice } = req.body as { overridePrice: number };

  const override = await pricingService.updateOverride(overrideId, {
    overridePrice: overridePrice.toFixed(2),
  });

  return sendResponse(res, { data: { override } });
});

export const deleteOverride: RequestHandler = tryCatchUtil(async (req, res) => {
  const overrideId = req.params["overrideId"] as string;

  await pricingService.deleteOverride(overrideId);

  return sendResponse(res, { data: { id: overrideId } });
});
