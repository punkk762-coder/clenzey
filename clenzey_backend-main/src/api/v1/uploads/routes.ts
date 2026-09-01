import express, { type RequestHandler, type Router } from "express";
import { ipKeyGenerator } from "express-rate-limit";

import { HttpStatusCode } from "axios";

import ErrorCode from "../../../errors/errorCode.ts";
import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { createRateLimiter } from "../../../middlewares/createRateLimiter.ts";
import { sendResponse } from "../../../utilities/commonUtils.ts";
import * as uploadsController from "./controllers.ts";
import * as uploadsValidation from "./validations.ts";

export const presignUploadRateLimiter: RequestHandler = createRateLimiter({
  handler: (_req, res) => {
    return sendResponse(res, {
      error: {
        code: ErrorCode.RATE_LIMIT_ERROR,
      },
      message: "Too many upload presign requests. Please try again later.",
      statusCode: HttpStatusCode.TooManyRequests,
    });
  },
  keyGenerator: (req) => {
    const userId = req.user?.sub;
    return ipKeyGenerator(
      userId ? `upload-presign:${userId}` : `ip:${req.ip}`,
      56,
    );
  },
  legacyHeaders: false,
  limit: 30,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

const uploadsRoutes: Router = express.Router();

/**
 * @openapi
 * /uploads/presign:
 *   post:
 *     tags:
 *       - uploads
 *     summary: Get a presigned URL for direct image upload to S3
 *     description: >
 *       Returns a presigned PUT URL and the public CloudFront fileUrl to use
 *       in downstream APIs (KYC documents, booking photos, profile image).
 *       Purpose-based access: kyc and booking_photo require PARTNER;
 *       dispute_evidence allows CONSUMER or PARTNER for a booking they can dispute;
 *       profile allows CONSUMER, PARTNER, or ADMIN.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purpose, contentType]
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [kyc, booking_photo, dispute_evidence, profile]
 *               contentType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp, image/heic]
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 description: Required for booking_photo and dispute_evidence. For booking_photo the partner must be assigned; for dispute_evidence the consumer or assigned partner must own the booking.
 *     responses:
 *       200:
 *         description: Presigned upload URL generated
 *       400:
 *         description: Invalid purpose, booking, or content type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Role not allowed for this purpose
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
uploadsRoutes.post(
  "/presign",
  [
    requireAuth(["ADMIN", "CONSUMER", "PARTNER"]),
    presignUploadRateLimiter,
    uploadsValidation.validatePresignUploadBody,
  ],
  uploadsController.presignUpload,
);

export default uploadsRoutes;
