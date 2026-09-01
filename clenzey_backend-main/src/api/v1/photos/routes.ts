import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireApprovedPartner } from "../../../middlewares/requireApprovedPartnerMiddleware.ts";
import * as photosController from "./controllers.ts";
import * as photosValidation from "./validations.ts";

const photosRoutes: Router = express.Router();

/**
 * @openapi
 * /bookings/{id}/photos:
 *   post:
 *     tags:
 *       - photos
 *     summary: Upload a before/after photo for a booking
 *     description: >
 *       Allows the assigned partner to upload a photo for a booking.
 *       BEFORE photos require booking in CHECKED_IN or IN_PROGRESS status.
 *       AFTER photos require booking in IN_PROGRESS status.
 *       Maximum 20 photos per booking.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, fileUrl]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [BEFORE, AFTER]
 *               fileUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Invalid booking status or photo limit reached
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       422:
 *         description: Validation error
 */
photosRoutes.post(
  "/:id/photos",
  [
    requireAuth(["PARTNER"]),
    requireApprovedPartner,
    photosValidation.validateBookingIdParam,
    photosValidation.validateUploadPhotoBody,
  ],
  photosController.uploadPhoto,
);

/**
 * @openapi
 * /bookings/{id}/photos:
 *   get:
 *     tags:
 *       - photos
 *     summary: List photos for a booking
 *     description: >
 *       Returns all before/after photos for a booking, ordered by upload time.
 *       Accessible by the consumer, assigned partner, or admin.
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
 *         description: List of photos for the booking
 *       401:
 *         description: Unauthorized
 */
photosRoutes.get(
  "/:id/photos",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    photosValidation.validateBookingIdParam,
  ],
  photosController.listPhotos,
);

export default photosRoutes;
