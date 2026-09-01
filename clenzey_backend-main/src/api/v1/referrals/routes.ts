import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as referralsController from "./controllers.ts";
import * as referralsValidation from "./validations.ts";

const referralsRoutes: Router = express.Router();

/**
 * @openapi
 * /referrals/me:
 *   get:
 *     tags:
 *       - referrals
 *     summary: Get Refer & Earn page data
 *     description: >
 *       Returns the authenticated consumer's referral code, share message,
 *       whether they have applied a friend's code, and issued referral rewards.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refer & Earn page data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReferralMeResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Consumer not found
 */
referralsRoutes.get(
  "/me",
  [requireAuth(["CONSUMER"])],
  referralsController.getReferralMe,
);

/**
 * @openapi
 * /referrals/apply:
 *   post:
 *     tags:
 *       - referrals
 *     summary: Apply a friend's referral code
 *     description: >
 *       Links the authenticated consumer to a referrer and issues personal
 *       one-time reward coupons to both the referee and referrer.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplyReferralRequest'
 *     responses:
 *       201:
 *         description: Referral code applied and rewards issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApplyReferralResponse'
 *       400:
 *         description: Invalid or own referral code
 *       409:
 *         description: Referral code already applied
 *       422:
 *         description: Validation error
 */
referralsRoutes.post(
  "/apply",
  [
    requireAuth(["CONSUMER"]),
    referralsValidation.applyReferralRequest,
  ],
  referralsController.applyReferralCode,
);

export default referralsRoutes;
