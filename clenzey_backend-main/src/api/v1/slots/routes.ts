import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireOperationsAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as slotsController from "./controllers.ts";
import * as slotsValidation from "./validations.ts";

const slotsRoutes: Router = express.Router();

/**
 * @openapi
 * /slots:
 *   get:
 *     tags:
 *       - slots
 *     summary: List available slots for a service on a date
 *     description: Returns only slots with remaining capacity (capacity > reservedCount).
 *     parameters:
 *       - name: serviceId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: date
 *         in: query
 *         required: true
 *         schema: { type: string, format: date, example: "2026-05-20" }
 *     responses:
 *       200:
 *         description: List of available slots
 *       422:
 *         description: Validation error
 */
slotsRoutes.get(
  "/",
  [slotsValidation.listAvailableQuery],
  slotsController.listAvailableSlots,
);

/**
 * @openapi
 * /slots/admin:
 *   get:
 *     tags:
 *       - slots
 *     summary: List all slots in a range (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: serviceId
 *         in: query
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: fromAt
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - name: toAt
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Slot list including full/inactive
 */
slotsRoutes.get(
  "/admin",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, slotsValidation.listAdminSlotsQuery],
  slotsController.listAdminSlots,
);

/**
 * @openapi
 * /slots/generate:
 *   post:
 *     tags:
 *       - slots
 *     summary: Generate slots for a date range (admin)
 *     description: >
 *       Creates fixed-length slots for every day in `[fromDate, toDate]` between
 *       `startHour` and `endHour`. Existing slots (same service + start time) are skipped.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateSlotsRequest'
 *           example:
 *             serviceId: "00000000-0000-0000-0000-000000000001"
 *             fromDate: "2026-05-20"
 *             toDate: "2026-06-20"
 *             startHour: 8
 *             endHour: 20
 *             slotDurationMin: 60
 *             capacity: 5
 *     responses:
 *       201:
 *         description: Slots generated
 *       422:
 *         description: Validation error
 */
slotsRoutes.post(
  "/generate",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, slotsValidation.generateSlotsRequest],
  slotsController.generateSlots,
);

/**
 * @openapi
 * /slots/{slotId}/capacity:
 *   patch:
 *     tags:
 *       - slots
 *     summary: Update slot capacity (admin)
 *     description: >
 *       Cannot be reduced below the current `reservedCount`. Use this to add
 *       evening capacity for a busy day, or close a slot by setting capacity = reservedCount.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: slotId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [capacity]
 *             properties:
 *               capacity: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Slot updated
 *       400:
 *         description: Capacity below current reservations
 *       404:
 *         description: Slot not found
 */
slotsRoutes.patch(
  "/:slotId/capacity",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, slotsValidation.updateCapacityRequest],
  slotsController.updateSlotCapacity,
);

export default slotsRoutes;
