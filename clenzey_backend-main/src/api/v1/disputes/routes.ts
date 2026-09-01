import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as disputesController from "./controllers.ts";
import * as disputesValidation from "./validations.ts";

const disputesRoutes: Router = express.Router();

/**
 * @openapi
 * /disputes:
 *   post:
 *     tags:
 *       - disputes
 *     summary: Create a dispute for a booking
 *     description: >
 *       Allows a consumer or partner to raise a dispute for a booking in
 *       COMPLETED or CANCELLED status within 7 days. Duplicate active disputes
 *       (OPEN or UNDER_REVIEW) for the same booking and user are rejected with 409.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, category, description]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *               category:
 *                 type: string
 *                 enum: [SERVICE_QUALITY, PRICING, DAMAGE, NO_SHOW, OTHER]
 *               description: { type: string, minLength: 10, maxLength: 2000 }
 *     responses:
 *       201:
 *         description: Dispute created successfully
 *       400:
 *         description: Booking not in valid status or outside 7-day window
 *       403:
 *         description: Booking does not belong to the caller
 *       409:
 *         description: Active dispute already exists for this booking
 *       422:
 *         description: Validation error
 */
disputesRoutes.post(
  "/",
  [requireAuth(["CONSUMER", "PARTNER"]), disputesValidation.createDisputeRequest],
  disputesController.createDispute,
);

/**
 * @openapi
 * /disputes:
 *   get:
 *     tags:
 *       - disputes
 *     summary: List own disputes
 *     description: >
 *       Returns paginated disputes raised by the authenticated consumer or partner,
 *       sorted by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, RESOLVED, CLOSED]
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of user's disputes
 *       401:
 *         description: Unauthorized
 */
disputesRoutes.get(
  "/",
  [requireAuth(["CONSUMER", "PARTNER"]), disputesValidation.listDisputesRequest],
  disputesController.listMyDisputes,
);

/**
 * @openapi
 * /disputes/booking/{bookingId}:
 *   get:
 *     tags:
 *       - disputes
 *     summary: Get dispute status for a booking
 *     description: >
 *       Returns whether the authenticated user can raise a dispute for the booking,
 *       whether an active dispute exists, and the latest dispute details if any.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dispute status for the booking
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Booking does not belong to the caller
 *       404:
 *         description: Booking not found
 */
disputesRoutes.get(
  "/booking/:bookingId",
  [
    requireAuth(["CONSUMER", "PARTNER"]),
    disputesValidation.validateBookingIdParam,
  ],
  disputesController.getBookingDisputeStatus,
);

/**
 * @openapi
 * /disputes/{id}/evidence:
 *   post:
 *     tags:
 *       - disputes
 *     summary: Attach evidence photo to a dispute
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileUrl]
 *             properties:
 *               fileUrl: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: Evidence attached
 */
disputesRoutes.post(
  "/:id/evidence",
  [
    requireAuth(["CONSUMER", "PARTNER"]),
    disputesValidation.validateDisputeIdParam,
    disputesValidation.addDisputeEvidenceRequest,
  ],
  disputesController.addDisputeEvidence,
);

disputesRoutes.get(
  "/:id/evidence",
  [
    requireAuth(["CONSUMER", "PARTNER"]),
    disputesValidation.validateDisputeIdParam,
  ],
  disputesController.listDisputeEvidence,
);

/**
 * @openapi
 * /disputes/{id}:
 *   get:
 *     tags:
 *       - disputes
 *     summary: Get a dispute by ID
 *     description: >
 *       Returns full details of a dispute raised by the authenticated user,
 *       including resolution notes when resolved.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dispute detail
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Dispute does not belong to the caller
 *       404:
 *         description: Dispute not found
 */
disputesRoutes.get(
  "/:id",
  [
    requireAuth(["CONSUMER", "PARTNER"]),
    disputesValidation.validateDisputeIdParam,
  ],
  disputesController.getDispute,
);

export default disputesRoutes;

export const disputesAdminRoutes: Router = express.Router();

/**
 * @openapi
 * /admin/disputes:
 *   get:
 *     tags:
 *       - admin-disputes
 *     summary: List all disputes with filters
 *     description: >
 *       Returns paginated disputes with optional filters by status, category,
 *       booking ID, and date range. Sorted by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, RESOLVED, CLOSED]
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [SERVICE_QUALITY, PRICING, DAMAGE, NO_SHOW, OTHER]
 *       - name: bookingId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: dateFrom
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: dateTo
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of all disputes
 *       401:
 *         description: Unauthorized
 */
disputesAdminRoutes.get(
  "/disputes",
  [requireAuth(["ADMIN"]), disputesValidation.adminListDisputesRequest],
  disputesController.listAdminDisputes,
);

/**
 * @openapi
 * /admin/disputes/{id}:
 *   get:
 *     tags:
 *       - admin-disputes
 *     summary: Get dispute detail with booking context
 *     description: >
 *       Returns a dispute with linked booking summary for admin investigation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dispute detail with booking context
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Dispute not found
 */
disputesAdminRoutes.get(
  "/disputes/:id",
  [requireAuth(["ADMIN"]), disputesValidation.validateDisputeIdParam],
  disputesController.getAdminDispute,
);

/**
 * @openapi
 * /admin/disputes/{id}:
 *   patch:
 *     tags:
 *       - admin-disputes
 *     summary: Update dispute status and resolution notes
 *     description: >
 *       Allows admin to update a dispute's status (UNDER_REVIEW, RESOLVED, CLOSED)
 *       and optionally add resolution notes. On RESOLVED, the raising party is
 *       notified via in-app notification.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [UNDER_REVIEW, RESOLVED, CLOSED]
 *               resolutionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispute updated
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Dispute not found
 *       422:
 *         description: Validation error
 */
disputesAdminRoutes.patch(
  "/disputes/:id",
  [
    requireAuth(["ADMIN"]),
    disputesValidation.validateDisputeIdParam,
    disputesValidation.updateDisputeRequest,
  ],
  disputesController.updateDispute,
);
