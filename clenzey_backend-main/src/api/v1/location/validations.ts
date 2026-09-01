import type { RequestHandler } from "express";

import z from "zod";

import { RequestValidationError } from "../../../errors/appErrors.ts";
import { formattedErrorDetails } from "../../../utilities/commonUtils.ts";

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

const reverseGeocodeQueryDto = z.object({
  latitude,
  longitude,
});

const geocodeAddressQueryDto = z.object({
  query: z.string().min(1).max(500),
});

const placesSearchQueryDto = z.object({
  query: z.string().min(1).max(200),
  sessionToken: z.string().min(1).max(80).optional(),
});

const placeDetailsQueryDto = z.object({
  placeId: z.string().min(1).max(200),
});

const serviceabilityQueryDto = z.object({
  latitude,
  longitude,
  serviceId: z.uuid().optional(),
});

const nearbyZonesQueryDto = z.object({
  latitude,
  longitude,
  radiusMeters: z.coerce.number().int().min(100).max(50000).optional(),
});

const runZod = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(formattedErrorDetails(result.error.issues));
  }
  return result.data;
};

const attachQuery = (req: Parameters<RequestHandler>[0], data: unknown) => {
  (req as unknown as { validatedQuery: unknown }).validatedQuery = data;
};

export const reverseGeocodeQuery: RequestHandler = (req, _res, next) => {
  attachQuery(req, runZod(reverseGeocodeQueryDto, req.query));
  next();
};

export const geocodeAddressQuery: RequestHandler = (req, _res, next) => {
  attachQuery(req, runZod(geocodeAddressQueryDto, req.query));
  next();
};

export const placesSearchQuery: RequestHandler = (req, _res, next) => {
  attachQuery(req, runZod(placesSearchQueryDto, req.query));
  next();
};

export const placeDetailsQuery: RequestHandler = (req, _res, next) => {
  attachQuery(req, runZod(placeDetailsQueryDto, req.query));
  next();
};

export const serviceabilityQuery: RequestHandler = (req, _res, next) => {
  attachQuery(req, runZod(serviceabilityQueryDto, req.query));
  next();
};

export const nearbyZonesQuery: RequestHandler = (req, _res, next) => {
  attachQuery(req, runZod(nearbyZonesQueryDto, req.query));
  next();
};
