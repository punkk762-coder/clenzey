import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireFinanceAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as refundsController from "./controllers.ts";
import * as refundsValidation from "./validations.ts";

const refundsRoutes: Router = express.Router();

/**
 * @openapi
 * /admin/refunds:
 *   post:
 *     tags:
 *       - admin-refunds
 *     summary: Initiate a refund for a booking
 *     description: >
 *       Initiates a full or partial refund for a booking that has a captured
 *       Razorpay payment. Validates that the refund amount does not exceed
 *       the remaining refundable amount (captured - previously refunded).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, amount]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *               amount: { type: number, minimum: 0, exclusiveMinimum: true }
 *               reason: { type: string, maxLength: 1000 }
 *     responses:
 *       201:
 *         description: Refund initiated
 *       400:
 *         description: Invalid amount or payment not in refundable state
 *       404:
 *         description: Booking or payment not found
 *       502:
 *         description: Razorpay API error
 */
refundsRoutes.post(
  "/",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, refundsValidation.initiateRefundRequest],
  refundsController.initiateRefund,
);

/**
 * @openapi
 * /admin/refunds:
 *   get:
 *     tags:
 *       - admin-refunds
 *     summary: List refund transactions
 *     description: >
 *       Returns paginated refund transactions with optional filters by status,
 *       date range, and booking ID. Sorted by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [INITIATED, PROCESSING, COMPLETED, FAILED]
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
 *         description: Paginated list of refunds
 *       401:
 *         description: Unauthorized
 */
refundsRoutes.get(
  "/",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, refundsValidation.listRefundsRequest],
  refundsController.listRefunds,
);

export default refundsRoutes;
