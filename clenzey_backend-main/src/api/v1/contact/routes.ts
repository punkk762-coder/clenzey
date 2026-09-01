import express, { type RequestHandler, type Router } from "express";
import { ipKeyGenerator } from "express-rate-limit";

import { HttpStatusCode } from "axios";
import ErrorCode from "../../../errors/errorCode.ts";
import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { createRateLimiter } from "../../../middlewares/createRateLimiter.ts";
import { sendResponse } from "../../../utilities/commonUtils.ts";
import * as contactController from "./controllers.ts";
import * as contactValidation from "./validations.ts";

/**
 * Per-user rate limiter for contact requests: 10 requests per hour.
 */
export const contactRateLimiter: RequestHandler = createRateLimiter({
  handler: (_req, res) => {
    return sendResponse(res, {
      error: {
        code: ErrorCode.RATE_LIMIT_ERROR,
      },
      message: "Too many contact requests. Please try again later.",
      statusCode: HttpStatusCode.TooManyRequests,
    });
  },
  keyGenerator: (req) => {
    const userId = req.user?.sub;
    return ipKeyGenerator(userId ? `contact:${userId}` : `ip:${req.ip}`, 56);
  },
  legacyHeaders: false,
  limit: 10,
  standardHeaders: true,
  windowMs: 60 * 60 * 1000,
});

const contactRoutes: Router = express.Router();

/**
 * @openapi
 * /bookings/{id}/contact/partner:
 *   get:
 *     tags:
 *       - contact
 *     summary: Get partner phone number for an active booking
 *     description: >
 *       Returns the assigned partner's phone number for a booking in an active
 *       state (PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS).
 *       Only the consumer who owns the booking can access this endpoint.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Partner phone number
 *       403:
 *         description: Not authorized or booking not in active state
 *       404:
 *         description: Booking not found
 *       429:
 *         description: Rate limit exceeded
 */
contactRoutes.get(
  "/:id/contact/partner",
  [
    requireAuth(["CONSUMER"]),
    contactRateLimiter,
    contactValidation.validateBookingIdParam,
  ],
  contactController.getPartnerContact,
);

/**
 * @openapi
 * /bookings/{id}/contact/consumer:
 *   get:
 *     tags:
 *       - contact
 *     summary: Get consumer phone number for an active booking
 *     description: >
 *       Returns the consumer's phone number for a booking assigned to the
 *       requesting partner in an active state.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Consumer phone number
 *       403:
 *         description: Not authorized or booking not in active state
 *       404:
 *         description: Booking not found
 *       429:
 *         description: Rate limit exceeded
 */
contactRoutes.get(
  "/:id/contact/consumer",
  [
    requireAuth(["PARTNER"]),
    contactRateLimiter,
    contactValidation.validateBookingIdParam,
  ],
  contactController.getConsumerContact,
);

export default contactRoutes;
