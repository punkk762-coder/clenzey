import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { geocodingRequestLimiter } from "../../../middlewares/rateLimiterMiddleware.ts";
import * as locationController from "./controllers.ts";
import * as locationValidation from "./validations.ts";

const locationRoutes: Router = express.Router();

/**
 * @openapi
 * /location/reverse-geocode:
 *   get:
 *     tags:
 *       - location
 *     summary: Reverse-geocode coordinates and check serviceability
 *     description: >
 *       Converts (latitude, longitude) into a structured address (using Google
 *       Geocoding API when configured, mock otherwise) and tells the caller
 *       whether the point lies inside a serviceable zone.
 *
 *       Use this endpoint right after the consumer detects their GPS position
 *       — autofill the address form from `data.address` and gate booking on
 *       `data.serviceability.isServiceable`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         schema: { type: number, format: float }
 *       - name: longitude
 *         in: query
 *         required: true
 *         schema: { type: number, format: float }
 *     responses:
 *       200: { description: Address + serviceability }
 *       422: { description: Validation error }
 *       429: { description: Rate limit exceeded }
 */
locationRoutes.get(
  "/reverse-geocode",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    geocodingRequestLimiter,
    locationValidation.reverseGeocodeQuery,
  ],
  locationController.reverseGeocode,
);

/**
 * @openapi
 * /location/geocode:
 *   get:
 *     tags:
 *       - location
 *     summary: Forward-geocode an address string or plus code
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Address + serviceability (address null when not found) }
 *       429: { description: Rate limit exceeded }
 */
locationRoutes.get(
  "/geocode",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    geocodingRequestLimiter,
    locationValidation.geocodeAddressQuery,
  ],
  locationController.geocodeAddress,
);

/**
 * @openapi
 * /location/places/search:
 *   get:
 *     tags:
 *       - location
 *     summary: Autocomplete places by query string
 *     description: >
 *       Returns place suggestions for an autocomplete-style search bar. Use the
 *       returned `placeId` with `/location/places/details` once the user picks
 *       a suggestion. Pass `sessionToken` (any opaque string per autocomplete
 *       session) to optimise Google billing.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema: { type: string }
 *       - name: sessionToken
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of suggestions }
 *       429: { description: Rate limit exceeded }
 */
locationRoutes.get(
  "/places/search",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    geocodingRequestLimiter,
    locationValidation.placesSearchQuery,
  ],
  locationController.searchPlaces,
);

/**
 * @openapi
 * /location/places/details:
 *   get:
 *     tags:
 *       - location
 *     summary: Resolve a place id into a structured address + serviceability
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: placeId
 *         in: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Address + serviceability }
 *       429: { description: Rate limit exceeded }
 */
locationRoutes.get(
  "/places/details",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    geocodingRequestLimiter,
    locationValidation.placeDetailsQuery,
  ],
  locationController.resolvePlace,
);

/**
 * @openapi
 * /location/serviceability:
 *   get:
 *     tags:
 *       - location
 *     summary: Check if a point is serviceable
 *     description: >
 *       Returns whether the (lat, lng) point is inside any active service zone.
 *       If `serviceId` is given, additionally checks that the service is
 *       enabled inside that zone. This endpoint is unauthenticated so the app
 *       can prompt the user before forcing them to log in.
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         schema: { type: number, format: float }
 *       - name: longitude
 *         in: query
 *         required: true
 *         schema: { type: number, format: float }
 *       - name: serviceId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Serviceability decision }
 */
locationRoutes.get(
  "/serviceability",
  [locationValidation.serviceabilityQuery],
  locationController.checkServiceability,
);

/**
 * @openapi
 * /location/nearby-zones:
 *   get:
 *     tags:
 *       - location
 *     summary: List active zones near a point
 *     description: >
 *       Helpful when the user is just outside our coverage — suggests the
 *       nearest zones they could pick up from, with straight-line distance.
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         schema: { type: number, format: float }
 *       - name: longitude
 *         in: query
 *         required: true
 *         schema: { type: number, format: float }
 *       - name: radiusMeters
 *         in: query
 *         schema: { type: integer, default: 15000, maximum: 50000 }
 *     responses:
 *       200: { description: Nearby zones }
 */
locationRoutes.get(
  "/nearby-zones",
  [locationValidation.nearbyZonesQuery],
  locationController.nearbyZones,
);

export default locationRoutes;
