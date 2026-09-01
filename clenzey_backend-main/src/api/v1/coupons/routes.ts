import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireOperationsAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as couponsController from "./controllers.ts";
import * as couponsValidation from "./validations.ts";

const couponsRoutes: Router = express.Router();

/**
 * @openapi
 * /coupons/validate:
 *   post:
 *     tags:
 *       - coupons
 *     summary: Validate a coupon against a booking context
 *     description: >
 *       Returns the computed discount for a coupon code, or 400 if the code
 *       is invalid, expired, exhausted, or doesn't meet the eligibility rules.
 *       Does NOT redeem the coupon — redemption happens during booking creation.
 *
 *       Provide either `amount` (pre-coupon subtotal: base + add-ons) or full
 *       booking context (`serviceId`, `variantId`, `addressId`, optional
 *       `addonIds`) so the server can compute the same subtotal used at checkout.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *               amount:
 *                 type: number
 *                 description: Pre-coupon subtotal (base price + add-ons). Optional when booking context is supplied.
 *               serviceId: { type: string, format: uuid }
 *               variantId: { type: string, format: uuid }
 *               addressId: { type: string, format: uuid }
 *               addonIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               subVariantId: { type: string, format: uuid }
 *               serviceCategory:
 *                 type: string
 *                 description: Optional; normalized server-side (e.g. deep_cleaning → DEEP_CLEANING)
 *                 enum: [QUICK_SHINE, DEEP_CLEANING, DEEP_LUXE, CORPORATE]
 *     responses:
 *       200:
 *         description: Coupon is valid; returns computed discount
 *       400:
 *         description: Coupon invalid / expired / ineligible
 *       401:
 *         description: Unauthorized
 */
couponsRoutes.post(
  "/validate",
  [requireAuth(["CONSUMER"]), couponsValidation.validateCouponRequest],
  couponsController.validateCoupon,
);

/**
 * @openapi
 * /coupons/offers:
 *   get:
 *     tags:
 *       - coupons
 *     summary: List active coupon offers for the home screen
 *     description: >
 *       Returns currently active, non-expired coupons formatted for display as
 *       promotional banners on the consumer home screen. No authentication required.
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10, maximum: 20 }
 *     responses:
 *       200:
 *         description: List of active coupon offers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     offers:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/CouponOffer' }
 */
couponsRoutes.get(
  "/offers",
  couponsValidation.listOffersQuery,
  couponsController.listOffers,
);

/**
 * @openapi
 * /coupons:
 *   get:
 *     tags:
 *       - coupons
 *     summary: List all coupons (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: activeOnly
 *         in: query
 *         schema: { type: boolean, default: false }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of coupons
 *       401:
 *         description: Unauthorized
 */
couponsRoutes.get(
  "/",
  [requireAuth(["ADMIN"]), couponsValidation.listCouponsQuery],
  couponsController.listCoupons,
);

/**
 * @openapi
 * /coupons:
 *   post:
 *     tags:
 *       - coupons
 *     summary: Create a coupon (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCouponRequest'
 *     responses:
 *       201:
 *         description: Coupon created
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
couponsRoutes.post(
  "/",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, couponsValidation.createCouponRequest],
  couponsController.createCoupon,
);

/**
 * @openapi
 * /coupons/{couponId}:
 *   get:
 *     tags:
 *       - coupons
 *     summary: Get a coupon (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: couponId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Coupon detail
 *       404:
 *         description: Not found
 */
couponsRoutes.get(
  "/:couponId",
  [requireAuth(["ADMIN"])],
  couponsController.getCoupon,
);

/**
 * @openapi
 * /coupons/{couponId}:
 *   patch:
 *     tags:
 *       - coupons
 *     summary: Update a coupon (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: couponId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCouponRequest'
 *     responses:
 *       200:
 *         description: Coupon updated
 *       404:
 *         description: Not found
 */
couponsRoutes.patch(
  "/:couponId",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, couponsValidation.updateCouponRequest],
  couponsController.updateCoupon,
);

export default couponsRoutes;
