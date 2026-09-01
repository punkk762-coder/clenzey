import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const lngLat = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const ring = z.array(lngLat).min(4, "Ring must have at least 4 points");
const polygon = z.array(ring).min(1, "Polygon must have at least one ring");
const multiPolygon = z
  .array(polygon)
  .min(1, "MultiPolygon must have at least one polygon");

const zoneFields = {
  boundary: multiPolygon,
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  name: z.string().min(1).max(120),
  priority: z.number().int().min(0).max(1000).optional(),
  serviceIds: z.array(z.uuid()).max(100).optional(),
  slug: z.string().min(2).max(80).regex(slugRegex, "Invalid slug"),
  state: z.string().min(1).max(100),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
  surgeMultiplier: z.number().min(1).max(10).optional(),
  tier: z.enum(["STANDARD", "PREMIUM", "CORPORATE_ONLY"]).optional(),
};

const createZoneDto = z.object(zoneFields);
const updateZoneDto = z.object(zoneFields).partial();

const listZonesQueryDto = z.object({
  city: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

export const createZoneRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(createZoneDto, req.body);
  next();
};

export const updateZoneRequest: RequestHandler = (req, _res, next) => {
  req.body = runZod(updateZoneDto, req.body);
  next();
};

export const listZonesQuery: RequestHandler = (req, _res, next) => {
  const parsed = runZod(listZonesQueryDto, req.query);
  (req as unknown as { validatedQuery: typeof parsed }).validatedQuery = parsed;
  next();
};
