import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireFinanceAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import { requireApprovedPartner } from "../../../middlewares/requireApprovedPartnerMiddleware.ts";
import * as earningsController from "./controllers.ts";
import * as earningsValidation from "./validations.ts";

// ── Partner Routes ───────────────────────────────────────────────────────────

export const partnerEarningsRoutes: Router = express.Router();

/**
 * @openapi
 * /partners/earnings/summary:
 *   get:
 *     tags:
 *       - partner-earnings
 *     summary: Get earnings summary for a date range
 *     description: >
 *       Returns the authenticated partner's earnings summary including total salary,
 *       total incentives, total deductions, total payouts, and current balance for
 *       the given date range.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: from
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - name: to
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Earnings summary
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
partnerEarningsRoutes.get(
  "/earnings/summary",
  [requireAuth(["PARTNER"]), requireApprovedPartner, earningsValidation.earningsSummaryRequest],
  earningsController.getEarningsSummary,
);

/**
 * @openapi
 * /partners/earnings:
 *   get:
 *     tags:
 *       - partner-earnings
 *     summary: List earning transactions
 *     description: >
 *       Returns paginated earning transactions for the authenticated partner,
 *       sorted by earning date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of earnings
 *       401:
 *         description: Unauthorized
 */
partnerEarningsRoutes.get(
  "/earnings",
  [requireAuth(["PARTNER"]), requireApprovedPartner, earningsValidation.listEarningsRequest],
  earningsController.listEarnings,
);

/**
 * @openapi
 * /partners/payouts:
 *   get:
 *     tags:
 *       - partner-earnings
 *     summary: List payout history
 *     description: >
 *       Returns paginated payout history for the authenticated partner,
 *       sorted by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of payouts
 *       401:
 *         description: Unauthorized
 */
partnerEarningsRoutes.get(
  "/payouts",
  [requireAuth(["PARTNER"]), requireApprovedPartner, earningsValidation.listPartnerPayoutsRequest],
  earningsController.listPartnerPayouts,
);

// ── Admin Routes ─────────────────────────────────────────────────────────────

export const adminPayoutsRoutes: Router = express.Router();

/**
 * @openapi
 * /admin/payouts:
 *   post:
 *     tags:
 *       - admin-payouts
 *     summary: Initiate a payout for a partner
 *     description: >
 *       Creates a new payout record with status PENDING. Validates that the amount
 *       does not exceed the partner's available balance.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerId, amount]
 *             properties:
 *               partnerId: { type: string, format: uuid }
 *               amount: { type: number, minimum: 0.01 }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Payout initiated
 *       400:
 *         description: Amount exceeds available balance
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
adminPayoutsRoutes.get(
  "/payouts/available-balance",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    earningsValidation.partnerBalanceRequest,
  ],
  earningsController.getPartnerAvailableBalance,
);

adminPayoutsRoutes.post(
  "/payouts",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, earningsValidation.initiatePayoutRequest],
  earningsController.initiatePayout,
);

/**
 * @openapi
 * /admin/payouts:
 *   get:
 *     tags:
 *       - admin-payouts
 *     summary: List all payouts with filters
 *     description: >
 *       Returns paginated payouts with optional filters by partner ID and status.
 *       Sorted by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: partnerId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, PAID, FAILED]
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of payouts
 *       401:
 *         description: Unauthorized
 */
adminPayoutsRoutes.get(
  "/payouts",
  [requireAuth(["ADMIN"]), requireFinanceAdmin, earningsValidation.adminListPayoutsRequest],
  earningsController.listAdminPayouts,
);

/**
 * @openapi
 * /admin/payouts/{id}/status:
 *   patch:
 *     tags:
 *       - admin-payouts
 *     summary: Update payout status
 *     description: >
 *       Updates the status of a payout (PROCESSING, PAID, or FAILED).
 *       Sets paidAt timestamp when transitioning to PAID.
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
 *                 enum: [PROCESSING, PAID, FAILED]
 *     responses:
 *       200:
 *         description: Payout status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payout not found
 *       422:
 *         description: Validation error
 */
adminPayoutsRoutes.patch(
  "/payouts/:id/status",
  [
    requireAuth(["ADMIN"]),
    requireFinanceAdmin,
    earningsValidation.validatePayoutIdParam,
    earningsValidation.updatePayoutStatusRequest,
  ],
  earningsController.updatePayoutStatus,
);
