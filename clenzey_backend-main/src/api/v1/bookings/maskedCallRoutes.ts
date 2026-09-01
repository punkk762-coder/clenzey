import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as maskedCallController from "./maskedCallController.ts";
import * as maskedCallValidations from "./maskedCallValidations.ts";

const maskedCallRoutes: Router = express.Router();

/**
 * @openapi
 * /bookings/{bookingId}/call:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Initiate a masked call to the assigned partner
 *     description: >
 *       Creates a privacy-protected call bridge between the consumer and the
 *       assigned partner. Returns a temporary virtual number
 *       that the consumer can dial. Only works when the booking is in an eligible
 *       state (PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Virtual number for the masked call
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     virtualNumber:
 *                       type: string
 *                       description: Temporary virtual number to dial
 *       400:
 *         description: Booking not in a callable state or no partner assigned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Consumer does not own this booking
 *       404:
 *         description: Booking not found
 *       409:
 *         description: A call bridge is already active for this booking
 *       503:
 *         description: Calling service temporarily unavailable
 */
maskedCallRoutes.post(
  "/:bookingId/call",
  [requireAuth(["CONSUMER"]), maskedCallValidations.validateBookingIdParam],
  maskedCallController.initiateCall,
);

export default maskedCallRoutes;
