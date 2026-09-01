import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as deviceTokenController from "./controllers.ts";
import * as deviceTokenValidation from "./validations.ts";

const deviceTokenRoutes: Router = express.Router();

// ── Partner device-token endpoints ────────────────────────────────────────────

/**
 * @openapi
 * /partners/device-token:
 *   post:
 *     tags:
 *       - device-tokens
 *     summary: Register a device token for push notifications (partner)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceToken, platform]
 *             properties:
 *               deviceToken: { type: string, minLength: 1 }
 *               platform: { type: string, enum: [ANDROID, IOS] }
 *     responses:
 *       201:
 *         description: Device token registered
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
deviceTokenRoutes.post(
  "/partners/device-token",
  [requireAuth(["PARTNER"]), deviceTokenValidation.registerDeviceTokenRequest],
  deviceTokenController.registerPartnerToken,
);

/**
 * @openapi
 * /partners/device-token:
 *   delete:
 *     tags:
 *       - device-tokens
 *     summary: Remove a device token (partner logout)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceToken]
 *             properties:
 *               deviceToken: { type: string, minLength: 1 }
 *     responses:
 *       200:
 *         description: Device token removed
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
deviceTokenRoutes.delete(
  "/partners/device-token",
  [requireAuth(["PARTNER"]), deviceTokenValidation.removeDeviceTokenRequest],
  deviceTokenController.removePartnerToken,
);

// ── Consumer device-token endpoints ───────────────────────────────────────────

/**
 * @openapi
 * /consumers/device-token:
 *   post:
 *     tags:
 *       - device-tokens
 *     summary: Register a device token for push notifications (consumer)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceToken, platform]
 *             properties:
 *               deviceToken: { type: string, minLength: 1 }
 *               platform: { type: string, enum: [ANDROID, IOS] }
 *     responses:
 *       201:
 *         description: Device token registered
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
deviceTokenRoutes.post(
  "/consumers/device-token",
  [requireAuth(["CONSUMER"]), deviceTokenValidation.registerDeviceTokenRequest],
  deviceTokenController.registerConsumerToken,
);

/**
 * @openapi
 * /consumers/device-token:
 *   delete:
 *     tags:
 *       - device-tokens
 *     summary: Remove a device token (consumer logout)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceToken]
 *             properties:
 *               deviceToken: { type: string, minLength: 1 }
 *     responses:
 *       200:
 *         description: Device token removed
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
deviceTokenRoutes.delete(
  "/consumers/device-token",
  [requireAuth(["CONSUMER"]), deviceTokenValidation.removeDeviceTokenRequest],
  deviceTokenController.removeConsumerToken,
);

export default deviceTokenRoutes;
