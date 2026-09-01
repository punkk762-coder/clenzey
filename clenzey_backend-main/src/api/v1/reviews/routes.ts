import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as reviewsController from "./controllers.ts";
import * as reviewsValidation from "./validations.ts";

// ─── Public / Consumer Reviews Routes ─────────────────────────────

const reviewsRoutes: Router = express.Router();

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags:
 *       - reviews
 *     summary: Submit a rating and review for a completed booking
 *     description: >
 *       Allows a consumer to submit a rating (1–5) and an optional text review
 *       (max 1000 characters) for a booking that has reached COMPLETED status.
 *       Duplicate ratings for the same booking are rejected with 409.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, rating]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               review: { type: string, maxLength: 1000 }
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Booking not completed or not owned by consumer
 *       409:
 *         description: Duplicate review for this booking
 *       422:
 *         description: Validation error
 */
reviewsRoutes.post(
  "/",
  [requireAuth(["CONSUMER"]), reviewsValidation.submitReviewRequest],
  reviewsController.submitReview,
);

/**
 * @openapi
 * /reviews/booking/{bookingId}:
 *   get:
 *     tags:
 *       - reviews
 *     summary: Get review status for a booking
 *     description: >
 *       Returns whether the authenticated consumer has already submitted a review
 *       for the booking, and whether the review form should still be shown.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Review status for the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviewStatus:
 *                       $ref: '#/components/schemas/BookingReviewStatus'
 *       400:
 *         description: Booking does not belong to the consumer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
reviewsRoutes.get(
  "/booking/:bookingId",
  [
    requireAuth(["CONSUMER"]),
    reviewsValidation.getBookingReviewStatusRequest,
  ],
  reviewsController.getBookingReviewStatus,
);

/**
 * @openapi
 * /reviews/partner/{partnerId}:
 *   get:
 *     tags:
 *       - reviews
 *     summary: Get paginated reviews for a partner
 *     description: >
 *       Returns reviews for the specified partner, sorted by creation date
 *       descending. This endpoint is public (no auth required).
 *     parameters:
 *       - name: partnerId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of partner reviews
 *       422:
 *         description: Validation error
 */
reviewsRoutes.get(
  "/partner/:partnerId",
  [reviewsValidation.getPartnerReviewsRequest],
  reviewsController.getPartnerReviews,
);

// ─── Admin Reviews Routes ─────────────────────────────────────────

const adminReviewsRoutes: Router = express.Router();

/**
 * @openapi
 * /admin/reviews:
 *   get:
 *     tags:
 *       - admin-reviews
 *     summary: List all reviews with optional filters
 *     description: >
 *       Admin endpoint to list all reviews with optional filters by partner,
 *       consumer, rating range, and date range. Results are paginated.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: partnerId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: consumerId
 *         in: query
 *         schema: { type: string, format: uuid }
 *       - name: ratingMin
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - name: ratingMax
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - name: dateFrom
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: dateTo
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of all reviews with filters applied
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
adminReviewsRoutes.get(
  "/reviews",
  [requireAuth(["ADMIN"]), reviewsValidation.adminReviewsRequest],
  reviewsController.listAdminReviews,
);

export { adminReviewsRoutes };
export default reviewsRoutes;
