import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as paymentsController from "./controllers.ts";
import * as paymentsValidation from "./validations.ts";

const paymentsRoutes: Router = express.Router();

/**
 * @openapi
 * /payments/orders:
 *   post:
 *     tags:
 *       - payments
 *     summary: Create a Razorpay order for a booking
 *     description: >
 *       Creates (or returns the existing) Razorpay order for the given booking
 *       and transitions the booking to `PAYMENT_PENDING`. Use the returned
 *       order details with the Razorpay Web/Mobile checkout SDK.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     order: { type: object, description: "Razorpay order object" }
 *                     payment: { $ref: '#/components/schemas/Payment' }
 *       400:
 *         description: Booking already paid / not yours
 *       404:
 *         description: Booking not found
 */
paymentsRoutes.post(
  "/orders",
  [requireAuth(["CONSUMER"]), paymentsValidation.createOrderRequest],
  paymentsController.createOrder,
);

/**
 * @openapi
 * /payments/confirm:
 *   post:
 *     tags:
 *       - payments
 *     summary: Confirm payment using the Razorpay handler response
 *     description: >
 *       After the client-side Razorpay checkout calls its success handler,
 *       the frontend POSTs the `razorpay_order_id`, `razorpay_payment_id`,
 *       and `razorpay_signature` here. The server verifies the signature
 *       (HMAC-SHA256 of `order_id|payment_id`) and transitions the booking
 *       to `CONFIRMED` on success.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature]
 *             properties:
 *               razorpayOrderId: { type: string }
 *               razorpayPaymentId: { type: string }
 *               razorpaySignature: { type: string }
 *     responses:
 *       200:
 *         description: Payment confirmed; booking is CONFIRMED
 *       400:
 *         description: Invalid signature / not your booking
 */
paymentsRoutes.post(
  "/confirm",
  [requireAuth(["CONSUMER"]), paymentsValidation.confirmPaymentRequest],
  paymentsController.confirmPayment,
);

/**
 * @openapi
 * /payments/webhooks/razorpay:
 *   post:
 *     tags:
 *       - payments
 *     summary: Razorpay webhook receiver
 *     description: >
 *       Razorpay → Clenzey webhook endpoint. Validates the
 *       `x-razorpay-signature` header against the raw body using
 *       `RAZORPAY_WEBHOOK_SECRET`. Handles `payment.captured` and
 *       `payment.failed` events, updates the payment record, and transitions
 *       the booking to `CONFIRMED` on capture. This endpoint is unauthenticated
 *       but signature-verified — do not enable in production without the secret set.
 *     responses:
 *       200:
 *         description: Acknowledged
 *       400:
 *         description: Invalid signature
 */
paymentsRoutes.post(
  "/webhooks/razorpay",
  paymentsController.razorpayWebhook,
);

export default paymentsRoutes;
