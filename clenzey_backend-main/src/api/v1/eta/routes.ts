import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as etaController from "./controllers.ts";
import * as etaValidation from "./validations.ts";

const etaRoutes: Router = express.Router();

/**
 * @openapi
 * /bookings/{id}/eta:
 *   get:
 *     tags:
 *       - eta
 *     summary: Get current ETA for a booking
 *     description: >
 *       Returns the estimated time of arrival for the assigned partner.
 *       Only available when the booking is in PROFESSIONAL_EN_ROUTE status.
 *       Accessible by the consumer who owns the booking or the assigned partner.
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
 *         description: Current ETA details
 *       404:
 *         description: Booking not found or ETA unavailable
 */
etaRoutes.get(
  "/:id/eta",
  [requireAuth(["CONSUMER", "PARTNER"]), etaValidation.getEtaParams],
  etaController.getEta,
);

export default etaRoutes;
