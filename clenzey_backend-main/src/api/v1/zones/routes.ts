import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireSuperAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as zonesController from "./controllers.ts";
import * as zonesValidation from "./validations.ts";

const zonesRoutes: Router = express.Router();

/**
 * @openapi
 * /zones:
 *   get:
 *     tags:
 *       - zones
 *     summary: List service zones (admin)
 *     description: >
 *       Lists all configured serviceable zones ordered by priority (highest
 *       first). Filter by city or status. Use the public
 *       `/location/serviceability` endpoint to test whether a point is covered.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: city
 *         in: query
 *         schema: { type: string }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [ACTIVE, INACTIVE, DRAFT] }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 100, maximum: 200 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Zone list }
 *       401: { description: Unauthorized }
 */
zonesRoutes.get(
  "/",
  [requireAuth(["ADMIN"]), zonesValidation.listZonesQuery],
  zonesController.listZones,
);

/**
 * @openapi
 * /zones:
 *   post:
 *     tags:
 *       - zones
 *     summary: Create a service zone (admin)
 *     description: >
 *       Creates a serviceable zone defined by a GeoJSON-style MultiPolygon
 *       (`[[[ [lng, lat], ... ]], ...]`). At least one ring per polygon, each
 *       ring must be closed (first point == last). Pass `serviceIds` to limit
 *       which services are available inside this zone — omit to make all
 *       services unrestricted at the zone level.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, city, state, boundary]
 *             properties:
 *               name: { type: string, example: "Indiranagar" }
 *               slug: { type: string, example: "blr-indiranagar" }
 *               description: { type: string }
 *               city: { type: string, example: "Bengaluru" }
 *               state: { type: string, example: "Karnataka" }
 *               country: { type: string, example: "India" }
 *               status: { type: string, enum: [ACTIVE, INACTIVE, DRAFT] }
 *               tier: { type: string, enum: [STANDARD, PREMIUM, CORPORATE_ONLY] }
 *               priority: { type: integer }
 *               centerLat: { type: number, format: float }
 *               centerLng: { type: number, format: float }
 *               boundary:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items:
 *                       type: array
 *                       items: { type: number }
 *                 example:
 *                   - - - [77.6310, 12.9650]
 *                       - [77.6470, 12.9650]
 *                       - [77.6470, 12.9800]
 *                       - [77.6310, 12.9800]
 *                       - [77.6310, 12.9650]
 *               serviceIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       201: { description: Zone created }
 *       400: { description: Invalid polygon / duplicate slug }
 *       422: { description: Validation error }
 */
zonesRoutes.post(
  "/",
  [requireAuth(["ADMIN"]), zonesValidation.createZoneRequest],
  zonesController.createZone,
);

/**
 * @openapi
 * /zones/{zoneId}:
 *   get:
 *     tags:
 *       - zones
 *     summary: Get a zone with its boundary and service mappings (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Zone detail }
 *       404: { description: Not found }
 */
zonesRoutes.get(
  "/:zoneId",
  [requireAuth(["ADMIN"])],
  zonesController.getZone,
);

/**
 * @openapi
 * /zones/{zoneId}:
 *   patch:
 *     tags:
 *       - zones
 *     summary: Update a zone (admin)
 *     description: >
 *       Updates any zone field. Passing `boundary` replaces the polygon
 *       entirely. Passing `serviceIds` replaces the zone's service list.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Zone updated }
 *       404: { description: Not found }
 *       422: { description: Validation error }
 */
zonesRoutes.patch(
  "/:zoneId",
  [requireAuth(["ADMIN"]), zonesValidation.updateZoneRequest],
  zonesController.updateZone,
);

/**
 * @openapi
 * /zones/{zoneId}:
 *   delete:
 *     tags:
 *       - zones
 *     summary: Delete a zone (admin)
 *     description: Hard-deletes the zone and its service mappings.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
zonesRoutes.delete(
  "/:zoneId",
  [requireAuth(["ADMIN"]), requireSuperAdmin],
  zonesController.deleteZone,
);

export default zonesRoutes;
