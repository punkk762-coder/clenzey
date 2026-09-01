import type { RequestHandler } from "express";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as locationService from "./service.ts";

export const reverseGeocode: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (
    req as unknown as { validatedQuery: { latitude: number; longitude: number } }
  ).validatedQuery;
  const result = await locationService.reverseGeocodeWithServiceability(
    q.latitude,
    q.longitude,
  );
  return sendResponse(res, { data: result });
});

export const geocodeAddress: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (req as unknown as { validatedQuery: { query: string } }).validatedQuery;
  const result = await locationService.geocodeAddressQuery(q.query);
  return sendResponse(res, { data: result });
});

export const searchPlaces: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (
    req as unknown as {
      validatedQuery: { query: string; sessionToken?: string };
    }
  ).validatedQuery;
  const result = await locationService.searchPlacesByQuery(
    q.query,
    q.sessionToken ? { sessionToken: q.sessionToken } : {},
  );
  return sendResponse(res, { data: result });
});

export const resolvePlace: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (req as unknown as { validatedQuery: { placeId: string } })
    .validatedQuery;
  const result = await locationService.resolvePlace(q.placeId);
  return sendResponse(res, { data: result });
});

export const checkServiceability: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const q = (
      req as unknown as {
        validatedQuery: {
          latitude: number;
          longitude: number;
          serviceId?: string;
        };
      }
    ).validatedQuery;
    const result = await locationService.checkServiceability(
      q.latitude,
      q.longitude,
      q.serviceId,
    );
    return sendResponse(res, { data: { serviceability: result } });
  },
);

export const nearbyZones: RequestHandler = tryCatchUtil(async (req, res) => {
  const q = (
    req as unknown as {
      validatedQuery: {
        latitude: number;
        longitude: number;
        radiusMeters?: number;
      };
    }
  ).validatedQuery;
  const zones = await locationService.nearbyZones(
    q.latitude,
    q.longitude,
    q.radiusMeters,
  );
  return sendResponse(res, { data: { zones } });
});
