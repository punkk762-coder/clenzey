import type { RequestHandler } from "express";
import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(
      formattedErrorDetails(result.error.issues),
    );
  }
  return result.data;
};

const assignZonesBody = z.object({
  primaryZoneId: z.string().uuid().optional(),
  zoneIds: z.array(z.string().uuid()).min(1),
});

const baseLocationBody = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const partnerIdParam = z.object({
  id: z.string().uuid(),
});

const partnerZoneParams = z.object({
  id: z.string().uuid(),
  zoneId: z.string().uuid(),
});

export const assignZonesRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(assignZonesBody, req.body);
  runZod(partnerIdParam, req.params);
  next();
};

export const removeZoneRequest: RequestHandler = (req, _res, next) => {
  runZod(partnerZoneParams, req.params);
  next();
};

export const setPrimaryZoneRequest: RequestHandler = (req, _res, next) => {
  runZod(partnerZoneParams, req.params);
  next();
};

export const getPartnerZonesRequest: RequestHandler = (req, _res, next) => {
  runZod(partnerIdParam, req.params);
  next();
};

export const updateBaseLocationRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(baseLocationBody, req.body);
  runZod(partnerIdParam, req.params);
  next();
};
