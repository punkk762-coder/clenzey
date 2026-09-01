import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as pricingController from "./pricingController.ts";

const pricingRoutes: Router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /admin/zones/{zoneId}/price-overrides:
 *   post:
 *     tags:
 *       - zone-pricing
 *     summary: Create a zone price override (admin)
 *     description: >
 *       Creates a new price override for a specific service variant within a zone.
 *       The override price must be between 1.00 and 999999.99. Rejects duplicates
 *       for the same zone-service-variant combination with a 409 Conflict.
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
 *           schema:
 *             type: object
 *             required: [serviceId, variantId, overridePrice]
 *             properties:
 *               serviceId: { type: string, format: uuid }
 *               variantId: { type: string, format: uuid }
 *               overridePrice: { type: number, minimum: 1.00, maximum: 999999.99 }
 *     responses:
 *       201: { description: Override created }
 *       400: { description: Invalid service or variant reference }
 *       404: { description: Zone not found }
 *       409: { description: Duplicate zone-service-variant combination }
 *       422: { description: Validation error }
 */
pricingRoutes.post(
  "/",
  [requireAuth(["ADMIN"]), pricingController.validateCreateOverride],
  pricingController.createOverride,
);

/**
 * @openapi
 * /admin/zones/{zoneId}/price-overrides:
 *   get:
 *     tags:
 *       - zone-pricing
 *     summary: List zone price overrides (admin)
 *     description: >
 *       Returns all price overrides for the specified zone.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of overrides }
 *       401: { description: Unauthorized }
 */
pricingRoutes.get(
  "/",
  [requireAuth(["ADMIN"])],
  pricingController.listOverrides,
);

/**
 * @openapi
 * /admin/zones/{zoneId}/price-overrides/{overrideId}:
 *   put:
 *     tags:
 *       - zone-pricing
 *     summary: Update a zone price override (admin)
 *     description: >
 *       Updates the override price for an existing zone price override.
 *       The new price must be between 1.00 and 999999.99.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: overrideId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [overridePrice]
 *             properties:
 *               overridePrice: { type: number, minimum: 1.00, maximum: 999999.99 }
 *     responses:
 *       200: { description: Override updated }
 *       404: { description: Override not found }
 *       422: { description: Validation error }
 */
pricingRoutes.put(
  "/:overrideId",
  [requireAuth(["ADMIN"]), pricingController.validateUpdateOverride],
  pricingController.updateOverride,
);

/**
 * @openapi
 * /admin/zones/{zoneId}/price-overrides/{overrideId}:
 *   delete:
 *     tags:
 *       - zone-pricing
 *     summary: Delete a zone price override (admin)
 *     description: >
 *       Permanently removes a zone price override. The zone will fall back
 *       to global variant pricing for the affected service variant.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: zoneId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: overrideId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Override deleted }
 *       404: { description: Override not found }
 */
pricingRoutes.delete(
  "/:overrideId",
  [requireAuth(["ADMIN"])],
  pricingController.deleteOverride,
);

export default pricingRoutes;
