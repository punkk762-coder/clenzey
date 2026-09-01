import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireSuperAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as servicesController from "./controllers.ts";
import * as servicesValidation from "./validations.ts";

export const servicesRoutes: Router = express.Router();
export const quotationsRoutes: Router = express.Router();

/**
 * @openapi
 * /services:
 *   get:
 *     tags:
 *       - services
 *     summary: List all active services
 *     description: Returns all active services ordered by sort order. Each service includes inline `variants`, `addons` and `inclusions` arrays.
 *     responses:
 *       200:
 *         description: List of services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Service' }
 */
servicesRoutes.get("/", servicesController.listServices);

/**
 * @openapi
 * /services/{serviceId}:
 *   get:
 *     tags: [services]
 *     summary: Get service detail
 *     description: Returns the full service including inline variants, add-ons and "what's included" items, sorted by sortOrder.
 *     parameters:
 *       - { name: serviceId, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Service detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     service: { $ref: '#/components/schemas/ServiceDetail' }
 *       404:
 *         description: Service not found
 */
servicesRoutes.get("/:serviceId", servicesController.getServiceDetail);

/**
 * @openapi
 * /services/{serviceId}/estimate:
 *   post:
 *     tags: [services]
 *     summary: Calculate price estimate
 *     description: Calculates total price for a selected variant and optional add-ons. Both variant and add-on IDs must exist inside the service's JSON arrays.
 *     parameters:
 *       - { name: serviceId, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EstimateRequest' }
 *           example:
 *             variantId: "00000000-0000-0000-0000-000000000001"
 *             addonIds: ["00000000-0000-0000-0000-000000000010"]
 *     responses:
 *       200:
 *         description: Price estimate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     estimate: { $ref: '#/components/schemas/EstimateResponse' }
 *       400:
 *         description: Invalid variant or add-on for this service
 *       404:
 *         description: Service not found
 *       422:
 *         description: Validation error
 */
servicesRoutes.post(
  "/:serviceId/estimate",
  [servicesValidation.estimateRequest],
  servicesController.getEstimate,
);

/**
 * @openapi
 * /services/{serviceId}/large-office-estimate:
 *   post:
 *     tags: [services]
 *     summary: Calculate large-office price estimate
 *     description: |
 *       Returns an instant base price for 100+ employee corporate offices.
 *       Requires the INSPECTION variant (`emp_100_plus`) and a completed scope questionnaire.
 *     parameters:
 *       - { name: serviceId, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LargeOfficeEstimateRequest' }
 *     responses:
 *       200:
 *         description: Large-office price estimate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     estimate: { $ref: '#/components/schemas/LargeOfficeEstimateResponse' }
 *       400:
 *         description: Invalid variant or scope for this service
 *       404:
 *         description: Service not found
 *       422:
 *         description: Validation error
 */
servicesRoutes.post(
  "/:serviceId/large-office-estimate",
  [servicesValidation.largeOfficeEstimateRequest],
  servicesController.getLargeOfficeEstimate,
);

/**
 * @openapi
 * /quotations:
 *   post:
 *     tags: [quotations]
 *     summary: Request a site visit
 *     description: Submits a quotation / site visit request. Requires a consumer JWT.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/QuotationRequestBody' }
 *     responses:
 *       201:
 *         description: Quotation request submitted
 *       401:
 *         description: Missing or invalid authorization token
 *       422:
 *         description: Validation error
 */
quotationsRoutes.post(
  "/",
  [requireAuth(["CONSUMER"]), servicesValidation.quotationRequest],
  servicesController.createQuotationRequest,
);

quotationsRoutes.get(
  "/",
  [requireAuth(["CONSUMER"])],
  servicesController.listConsumerQuotations,
);

quotationsRoutes.post(
  "/:id/accept",
  [requireAuth(["CONSUMER"])],
  servicesController.acceptConsumerQuotation,
);

quotationsRoutes.delete(
  "/:id",
  [requireAuth(["CONSUMER"])],
  servicesController.deleteConsumerQuotation,
);

// ── Admin: service catalogue management ────────────────────────────

/**
 * @openapi
 * /services:
 *   post:
 *     tags: [services]
 *     summary: Create a service (admin)
 *     description: Creates a new service. Variants, addons and inclusions are part of the same request body and stored inline as JSONB columns on the service row.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateServiceRequest' }
 *     responses:
 *       201:
 *         description: Service created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     service: { $ref: '#/components/schemas/Service' }
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
servicesRoutes.post(
  "/",
  [requireAuth(["ADMIN"]), servicesValidation.createServiceRequest],
  servicesController.createService,
);

/**
 * @openapi
 * /services/{serviceId}:
 *   patch:
 *     tags: [services]
 *     summary: Update a service (admin)
 *     description: Patches service-level fields and/or replaces the inline `variants`, `addons` or `inclusions` arrays. Each array fully replaces the existing JSON column when included.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: serviceId, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateServiceRequest' }
 *     responses:
 *       200:
 *         description: Updated service
 *   delete:
 *     tags: [services]
 *     summary: Soft-delete a service (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: serviceId, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Service deleted
 */
servicesRoutes.patch(
  "/:serviceId",
  [requireAuth(["ADMIN"]), servicesValidation.updateServiceRequest],
  servicesController.updateService,
);
servicesRoutes.delete(
  "/:serviceId",
  [requireAuth(["ADMIN"]), requireSuperAdmin],
  servicesController.deleteService,
);
