import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import {
  requireApprovedPartner,
  requireApprovedPartnerIfPartner,
} from "../../../middlewares/requireApprovedPartnerMiddleware.ts";
import * as bookingsController from "./controllers.ts";
import * as bookingsValidation from "./validations.ts";

const bookingsRoutes: Router = express.Router();

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Create a booking
 *     description: >
 *       Creates a booking in `PENDING` status. The system snapshots service, variant,
 *       address, consumer, and pricing at this point — later edits to the service
 *       catalogue won't affect existing bookings.
 *
 *       For `SCHEDULED` bookings, `scheduledAt` is required and must be in the future.
 *       For `INSTANT` bookings, `scheduledAt` is ignored.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingRequest'
 *           examples:
 *             instantQuickShine:
 *               summary: Instant Quick Shine booking
 *               value:
 *                 bookingType: INSTANT
 *                 serviceId: "00000000-0000-0000-0000-000000000001"
 *                 variantId: "00000000-0000-0000-0000-000000000010"
 *                 addressId: "00000000-0000-0000-0000-000000000100"
 *                 addonIds: ["00000000-0000-0000-0000-000000000020"]
 *                 paymentMode: RAZORPAY
 *             scheduledDeepClean:
 *               summary: Scheduled Deep Cleaning
 *               value:
 *                 bookingType: SCHEDULED
 *                 scheduledAt: "2026-05-20T10:00:00+05:30"
 *                 serviceId: "00000000-0000-0000-0000-000000000002"
 *                 variantId: "00000000-0000-0000-0000-000000000030"
 *                 addressId: "00000000-0000-0000-0000-000000000100"
 *                 subscriptionPlan: WEEKLY
 *                 consumerNotes: "Please bring vacuum, no shoes inside."
 *                 paymentMode: RAZORPAY
 *     responses:
 *       201:
 *         description: Booking created
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
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation against state (e.g. requires visit, invalid variant)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service, variant, or address not found
 *       422:
 *         description: Validation error
 */
bookingsRoutes.post(
  "/",
  [requireAuth(["CONSUMER"]), bookingsValidation.createBookingRequest],
  bookingsController.createBooking,
);

/**
 * @openapi
 * /bookings/preview:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Preview booking pricing without creating
 *     description: >
 *       Runs the full pricing pipeline (base + add-ons + subscription
 *       discount + coupon + GST + platform fee) and returns the breakdown.
 *       Does not persist anything and does not redeem the coupon.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PreviewBookingRequest'
 *     responses:
 *       200:
 *         description: Pricing breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     preview:
 *                       $ref: '#/components/schemas/BookingPreview'
 *       400:
 *         description: Invalid variant / addon / coupon
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
bookingsRoutes.post(
  "/preview",
  [requireAuth(["CONSUMER"]), bookingsValidation.previewBookingRequest],
  bookingsController.previewBooking,
);

/**
 * @openapi
 * /bookings/availability/check:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Check scheduled slot against partner availability
 *     description: >
 *       Validates whether a nearby partner can serve the selected date/time at
 *       the consumer location. Called when the consumer taps Book on a scheduled
 *       booking. Returns `matched: true` to proceed to checkout, or
 *       `matched: false` with alternative hourly slots grouped by period for
 *       the failure modal.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckAvailabilityRequest'
 *           example:
 *             serviceId: "00000000-0000-0000-0000-000000000001"
 *             variantId: "00000000-0000-0000-0000-000000000010"
 *             scheduledAt: "2026-06-18T18:00:00+05:30"
 *             addressId: "00000000-0000-0000-0000-000000000100"
 *     responses:
 *       200:
 *         description: Match result (success or alternatives)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CheckAvailabilityResponse'
 *       400:
 *         description: Invalid address, past scheduledAt, etc.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 *       422:
 *         description: Validation error
 */
bookingsRoutes.post(
  "/availability/check",
  [requireAuth(["CONSUMER"]), bookingsValidation.checkAvailabilityRequest],
  bookingsController.checkAvailability,
);

/**
 * @openapi
 * /bookings:
 *   get:
 *     tags:
 *       - bookings
 *     summary: List bookings for the current user
 *     description: >
 *       Returns bookings scoped to the caller. Consumers see their own bookings;
 *       partners see bookings assigned to them; admins see everything.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, PAYMENT_PENDING, CONFIRMED, PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, REFUNDED, NO_SHOW]
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of bookings (newest first)
 *       401:
 *         description: Unauthorized
 */
bookingsRoutes.get(
  "/",
  [requireAuth(["CONSUMER", "PARTNER", "ADMIN"]), requireApprovedPartnerIfPartner, bookingsValidation.listBookingsQuery],
  bookingsController.listBookings,
);

/**
 * @openapi
 * /bookings/{bookingId}:
 *   get:
 *     tags:
 *       - bookings
 *     summary: Get a booking with addons and status history
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
 *         description: Booking detail with addons and timeline
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       $ref: '#/components/schemas/BookingDetail'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
bookingsRoutes.get(
  "/:bookingId",
  [requireAuth(["CONSUMER", "PARTNER", "ADMIN"]), requireApprovedPartnerIfPartner],
  bookingsController.getBooking,
);

/**
 * @openapi
 * /bookings/{bookingId}/cancel:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Cancel a booking
 *     description: >
 *       Convenience wrapper around the transition endpoint. Cancellation is allowed
 *       only from non-terminal states and depends on who is calling
 *       (consumers can cancel up to `PROFESSIONAL_EN_ROUTE`; admins anytime before
 *       a terminal state).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Cannot cancel from the current status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
bookingsRoutes.post(
  "/:bookingId/cancel",
  [requireAuth(["CONSUMER", "PARTNER", "ADMIN"]), requireApprovedPartnerIfPartner, bookingsValidation.cancelBookingRequest],
  bookingsController.cancelBooking,
);

/**
 * @openapi
 * /bookings/{bookingId}/transition:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Transition a booking to a new status
 *     description: >
 *       Generic state transition endpoint. The server validates that the requested
 *       `toStatus` is allowed for both the current status AND the caller's role.
 *       Use this for partner actions (en route, checked in, started, completed)
 *       and admin overrides.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
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
 *             required: [toStatus]
 *             properties:
 *               toStatus:
 *                 type: string
 *                 enum: [PENDING, PAYMENT_PENDING, CONFIRMED, PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, REFUNDED, NO_SHOW]
 *               reason:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Booking transitioned
 *       400:
 *         description: Illegal transition for current status or actor
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
bookingsRoutes.post(
  "/:bookingId/transition",
  [requireAuth(["CONSUMER", "PARTNER", "ADMIN"]), requireApprovedPartnerIfPartner, bookingsValidation.transitionRequest],
  bookingsController.transitionBooking,
);

/**
 * @openapi
 * /bookings/{bookingId}/verify-start:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Verify 4-digit check-in code and start job
 *     description: >
 *       Partner enters the consumer's 4-digit verification code after arriving
 *       and uploading before photos. On success, booking transitions from
 *       PROFESSIONAL_EN_ROUTE to IN_PROGRESS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^[0-9]{4}$'
 *                 example: "4821"
 *     responses:
 *       200:
 *         description: Job started
 *       400:
 *         description: Invalid code, wrong status, or missing before photos
 *       429:
 *         description: Too many verification attempts
 */
bookingsRoutes.post(
  "/:bookingId/verify-start",
  [
    requireAuth(["PARTNER"]),
    requireApprovedPartner,
    bookingsValidation.verifyStartRequest,
  ],
  bookingsController.verifyStartBooking,
);

// ── Assignments (partner-side) ───────────────────────────────────────────────

/**
 * @openapi
 * /bookings/{bookingId}/reschedule:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Reschedule a booking to a new time
 *     description: >
 *       Allows a consumer to reschedule their booking to a different time slot.
 *       The booking must be in CONFIRMED or PROFESSIONAL_ASSIGNED status.
 *       Rescheduling is limited to 2 times per booking and must be at least
 *       4 hours from the current time.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookingId
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
 *             required: [newScheduledAt]
 *             properties:
 *               newScheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: New scheduled timestamp (ISO 8601)
 *               timeSlotId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional time slot ID to reserve
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 *       400:
 *         description: Invalid status, insufficient notice, or max reschedules exceeded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
bookingsRoutes.post(
  "/:id/reschedule",
  [requireAuth(["CONSUMER"]), bookingsValidation.rescheduleBookingRequest],
  bookingsController.rescheduleBooking,
);

/**
 * @openapi
 * /bookings/assignments/me:
 *   get:
 *     tags:
 *       - bookings
 *     summary: List my open assignment proposals (partner)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of PROPOSED assignments awaiting response
 */
bookingsRoutes.get(
  "/assignments/me",
  [requireAuth(["PARTNER"]), requireApprovedPartner],
  bookingsController.listMyAssignments,
);

/**
 * @openapi
 * /bookings/assignments/{assignmentId}:
 *   get:
 *     tags:
 *       - bookings
 *     summary: Get an assignment proposal (partner)
 *     security:
 *       - bearerAuth: []
 */
bookingsRoutes.get(
  "/assignments/:assignmentId",
  [requireAuth(["PARTNER"]), requireApprovedPartner],
  bookingsController.getMyAssignment,
);

/**
 * @openapi
 * /bookings/assignments/{assignmentId}/accept:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Accept a booking assignment (partner)
 *     description: >
 *       First partner to accept wins. The booking's `partnerId` is set and the
 *       status transitions to `PROFESSIONAL_ASSIGNED`. Subsequent accepts on
 *       the same booking return the accept record but won't reassign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assignmentId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Accepted
 *       400:
 *         description: Already responded / expired / not yours
 */
bookingsRoutes.post(
  "/assignments/:assignmentId/accept",
  [requireAuth(["PARTNER"]), requireApprovedPartner],
  bookingsController.acceptAssignment,
);

/**
 * @openapi
 * /bookings/assignments/{assignmentId}/decline:
 *   post:
 *     tags:
 *       - bookings
 *     summary: Decline a booking assignment (partner)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assignmentId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Declined
 *       400:
 *         description: Already responded / not yours
 */
bookingsRoutes.post(
  "/assignments/:assignmentId/decline",
  [requireAuth(["PARTNER"]), requireApprovedPartner],
  bookingsController.declineAssignment,
);

export default bookingsRoutes;
