import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const generateSlotsDto = z.object({
  capacity: z.number().int().min(1).max(50).optional(),
  endHour: z.number().int().min(1).max(24).optional(),
  fromDate: z.iso.date(),
  serviceId: z.uuid(),
  slotDurationMin: z.number().int().min(15).max(480).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  toDate: z.iso.date(),
});

const updateCapacityDto = z.object({
  capacity: z.number().int().min(0).max(100),
});

const listAvailableQueryDto = z.object({
  date: z.iso.date(),
  serviceId: z.uuid(),
});

const listAdminSlotsQueryDto = z.object({
  fromAt: z.iso.datetime(),
  serviceId: z.uuid(),
  toAt: z.iso.datetime(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const generateSlotsRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(generateSlotsDto, req.body);
  next();
};

export const updateCapacityRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateCapacityDto, req.body);
  next();
};

export const listAvailableQuery: RequestHandler = (req, _res, next) => {
  const parsed = runZod(listAvailableQueryDto, req.query);
  (req as unknown as { validatedQuery: typeof parsed }).validatedQuery = parsed;
  next();
};

export const listAdminSlotsQuery: RequestHandler = (req, _res, next) => {
  const parsed = runZod(listAdminSlotsQueryDto, req.query);
  (req as unknown as { validatedQuery: typeof parsed }).validatedQuery = parsed;
  next();
};
