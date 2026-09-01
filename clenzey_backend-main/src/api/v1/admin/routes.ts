import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import {
  requireFinanceAdmin,
  requireOperationsAdmin,
} from "../../../middlewares/requireAdminRoleMiddleware.ts";
import {
  adminLoginRateLimiter,
  ipAuthRateLimiter,
} from "../../../middlewares/loginRateLimiter.ts";
import * as adminController from "./controllers.ts";
import * as adminValidation from "./validations.ts";
import * as reviewsController from "../reviews/controllers.ts";
import * as reviewsValidation from "../reviews/validations.ts";
import * as servicesController from "../services/controllers.ts";
import * as bookingsController from "../bookings/controllers.ts";
import * as bookingsValidation from "../bookings/validations.ts";

const adminRoutes: Router = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/auth/login:
 *   post:
 *     tags:
 *       - admin-auth
 *     summary: Login with username and password
 *     description: >
 *       Authenticates an admin using their unique username and password.
 *       Returns a short-lived JWT access token (1 hour) and sets an
 *       `rft_admin` HttpOnly cookie with a 30-day refresh token.
 *       The token payload includes `role` (OPERATIONS | SUPPORT | FINANCE | SUPER_ADMIN)
 *       which can be used for further access control on admin endpoints.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "SecureP@ss1"
 *     responses:
 *       200:
 *         description: Admin signed in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAuthResponse'
 *       401:
 *         description: Invalid username or password
 *       422:
 *         description: Validation error
 */
adminRoutes.post(
  "/auth/login",
  [adminValidation.authLoginRequest, ipAuthRateLimiter, adminLoginRateLimiter],
  adminController.adminAuthLogin,
);

/**
 * @openapi
 * /admin/auth/refresh:
 *   post:
 *     tags:
 *       - admin-auth
 *     summary: Refresh access token
 *     description: >
 *       Issues a new access token using the `rft_admin` HttpOnly cookie.
 *       Returns 401 if the token is missing, expired, or does not belong
 *       to an ADMIN user type.
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenRefreshResponse'
 *       401:
 *         description: Refresh token cookie missing, expired, or wrong user type
 */
adminRoutes.post("/auth/refresh", adminController.adminAuthRefresh);

/**
 * @openapi
 * /admin/auth/logout:
 *   post:
 *     tags:
 *       - admin-auth
 *     summary: Log out
 *     description: Clears the `rft_admin` HttpOnly cookie, invalidating the session.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully."
 */
adminRoutes.post("/auth/logout", adminController.adminAuthLogout);

// ── Consumers ───────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/consumers:
 *   get:
 *     tags:
 *       - admin-network
 *     summary: List consumers
 *     description: >
 *       Returns a paginated list of consumers with their total bookings and
 *       lifetime spend (completed bookings). Optional `query` matches against
 *       full name, phone, or referral code.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *         description: Search by name, phone, or referral code
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of consumers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     consumers:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/AdminConsumer' }
 *       401: { description: Unauthorized }
 */
adminRoutes.get(
  "/consumers",
  [requireAuth(["ADMIN"])],
  adminController.listConsumers,
);

/**
 * @openapi
 * /admin/consumers/{id}:
 *   get:
 *     tags:
 *       - admin-network
 *     summary: Get a consumer by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Consumer detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     consumer: { $ref: '#/components/schemas/AdminConsumer' }
 *       404: { description: Consumer not found }
 */
adminRoutes.get(
  "/consumers/:id",
  [requireAuth(["ADMIN"])],
  adminController.getConsumer,
);

/**
 * @openapi
 * /admin/consumers/{id}:
 *   patch:
 *     tags:
 *       - admin-network
 *     summary: Update a consumer (block / reactivate)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateAdminConsumerRequest' }
 *     responses:
 *       200:
 *         description: Updated consumer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     consumer: { $ref: '#/components/schemas/AdminConsumer' }
 *       404: { description: Consumer not found }
 */
adminRoutes.patch(
  "/consumers/:id",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  adminController.updateConsumer,
);

adminRoutes.get(
  "/consumers/:id/addresses",
  [requireAuth(["ADMIN"])],
  adminController.getConsumerAddresses,
);

adminRoutes.get(
  "/consumers/:id/bookings",
  [requireAuth(["ADMIN"])],
  adminController.getConsumerBookings,
);

// ── Partners ────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/partners:
 *   get:
 *     tags:
 *       - admin-network
 *     summary: List partners
 *     description: >
 *       Returns a paginated list of partners. Optional `approvalStatus` filter
 *       narrows the result to one workflow state.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED]
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of partners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     partners:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/AdminPartner' }
 *       401: { description: Unauthorized }
 */
adminRoutes.get(
  "/partners",
  [requireAuth(["ADMIN"])],
  adminController.listPartners,
);

/**
 * @openapi
 * /admin/partners/operational-status:
 *   get:
 *     tags:
 *       - admin-network
 *     summary: List partner operational statuses (fleet)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100, maximum: 200 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Fleet operational status list
 */
adminRoutes.get(
  "/partners/operational-status",
  [requireAuth(["ADMIN"])],
  adminController.listPartnerOperationalStatuses,
);

/**
 * @openapi
 * /admin/partners/{id}:
 *   get:
 *     tags:
 *       - admin-network
 *     summary: Get a partner by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Partner detail
 *       404: { description: Partner not found }
 */
adminRoutes.get(
  "/partners/:id",
  [requireAuth(["ADMIN"])],
  adminController.getPartner,
);

/**
 * @openapi
 * /admin/partners/{id}/operational-status:
 *   get:
 *     tags:
 *       - admin-network
 *     summary: Get a single partner operational status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Partner operational snapshot
 *       404: { description: Partner not found }
 */
adminRoutes.get(
  "/partners/:id/operational-status",
  [requireAuth(["ADMIN"])],
  adminController.getPartnerOperationalStatus,
);

/**
 * @openapi
 * /admin/partners/{id}/approve:
 *   post:
 *     tags:
 *       - admin-network
 *     summary: Approve a partner
 *     description: >
 *       Transitions the partner to `APPROVED`, stamping `approvalDate` and
 *       recording the acting admin id in `approvedBy`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Approved partner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     partner: { $ref: '#/components/schemas/AdminPartner' }
 *       404: { description: Partner not found }
 */
adminRoutes.post(
  "/partners/:id/approve",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  adminController.approvePartner,
);

/**
 * @openapi
 * /admin/partners/{id}/reject:
 *   post:
 *     tags:
 *       - admin-network
 *     summary: Reject a partner
 *     description: Transitions the partner to `REJECTED` with an optional reason.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PartnerRejectionRequest' }
 *     responses:
 *       200:
 *         description: Rejected partner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     partner: { $ref: '#/components/schemas/AdminPartner' }
 *       404: { description: Partner not found }
 */
adminRoutes.post(
  "/partners/:id/reject",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  adminController.rejectPartner,
);

/**
 * @openapi
 * /admin/partners/{id}/suspend:
 *   post:
 *     tags:
 *       - admin-network
 *     summary: Suspend a partner
 *     description: Transitions the partner to `SUSPENDED` with an optional reason.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PartnerRejectionRequest' }
 *     responses:
 *       200:
 *         description: Suspended partner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     partner: { $ref: '#/components/schemas/AdminPartner' }
 *       404: { description: Partner not found }
 */
adminRoutes.post(
  "/partners/:id/suspend",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  adminController.suspendPartner,
);

// ── Reviews ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/reviews:
 *   get:
 *     tags:
 *       - admin-reviews
 *     summary: List all reviews with filters
 *     description: >
 *       Returns a paginated list of all reviews with optional filters by
 *       partner, consumer, rating range, and date range.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: partnerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: consumerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: ratingMin
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: ratingMax
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of reviews
 *       401:
 *         description: Unauthorized
 */
adminRoutes.get(
  "/reviews",
  [requireAuth(["ADMIN"]), reviewsValidation.adminReviewsRequest],
  reviewsController.listAdminReviews,
);

// ── Quotations ───────────────────────────────────────────────────────────────

adminRoutes.get(
  "/quotations",
  [requireAuth(["ADMIN"])],
  servicesController.listAdminQuotations,
);

adminRoutes.patch(
  "/quotations/:id",
  [requireAuth(["ADMIN"])],
  servicesController.updateAdminQuotationStatus,
);

// ── KPI & Analytics ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/kpis:
 *   get:
 *     tags:
 *       - admin-analytics
 *     summary: Get real-time KPIs
 *     description: >
 *       Returns real-time platform KPIs including today's bookings count,
 *       revenue, active partners, pending approvals, and average rating.
 *       Responses are cached for 60 seconds.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time KPIs
 *       401:
 *         description: Unauthorized
 */
adminRoutes.get("/kpis", [requireAuth(["ADMIN"])], adminController.getKPIs);

/**
 * @openapi
 * /admin/analytics/revenue:
 *   get:
 *     tags:
 *       - admin-analytics
 *     summary: Get revenue analytics
 *     description: >
 *       Returns revenue analytics for a date range: daily breakdown, total revenue,
 *       total bookings, average order value, and top services by revenue.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *       - name: dateTo
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Revenue analytics data
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error (invalid date range)
 */
adminRoutes.get(
  "/analytics/revenue",
  [requireAuth(["ADMIN"]), adminValidation.dateRangeRequest],
  adminController.getRevenueAnalytics,
);

/**
 * @openapi
 * /admin/analytics/partners:
 *   get:
 *     tags:
 *       - admin-analytics
 *     summary: Get partner performance metrics
 *     description: >
 *       Returns partner performance metrics including bookings completed,
 *       average rating, total earnings, and acceptance rate for each partner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *       - name: dateTo
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Partner performance data
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
adminRoutes.get(
  "/analytics/partners",
  [requireAuth(["ADMIN"]), adminValidation.dateRangeRequest],
  adminController.getPartnerPerformance,
);

/**
 * @openapi
 * /admin/analytics/customers:
 *   get:
 *     tags:
 *       - admin-analytics
 *     summary: Get customer analytics
 *     description: >
 *       Returns customer analytics: new signups per day, repeat booking rate,
 *       average lifetime value, and top customers by spend.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *       - name: dateTo
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Customer analytics data
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
adminRoutes.get(
  "/analytics/customers",
  [requireAuth(["ADMIN"]), adminValidation.dateRangeRequest],
  adminController.getCustomerAnalytics,
);

/**
 * @openapi
 * /admin/export/bookings:
 *   get:
 *     tags:
 *       - admin-analytics
 *     summary: Export bookings as CSV
 *     description: >
 *       Exports booking data as a CSV file with optional filters by
 *       date range, status, and service type.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: dateTo
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, PAYMENT_PENDING, CONFIRMED, PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, REFUNDED, NO_SHOW]
 *       - name: serviceType
 *         in: query
 *         schema: { type: string, format: uuid }
 *         description: Service ID to filter by
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
adminRoutes.get(
  "/export/bookings",
  [requireAuth(["ADMIN"]), adminValidation.exportBookingsRequest],
  adminController.exportBookingsCsv,
);

// ── Bookings: Admin Manual Assignment ────────────────────────────────────────

/**
 * @openapi
 * /admin/bookings/{id}/assign:
 *   post:
 *     tags:
 *       - admin-bookings
 *     summary: Manually assign a partner to a booking
 *     description: >
 *       Admin manually assigns a specific partner to a booking in CONFIRMED status.
 *       Validates that the partner has APPROVED status, the required service skill,
 *       and no overlapping active bookings. Transitions the booking to
 *       PROFESSIONAL_ASSIGNED and sends a push notification to the partner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerId]
 *             properties:
 *               partnerId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Partner assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking: { $ref: '#/components/schemas/Booking' }
 *       400:
 *         description: Booking not in CONFIRMED status, partner not APPROVED, or missing skill
 *       404:
 *         description: Booking or partner not found
 *       409:
 *         description: Partner has an overlapping active booking
 *       422:
 *         description: Validation error (invalid partnerId)
 */
adminRoutes.post(
  "/bookings/:id/assign",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, bookingsValidation.adminAssignPartnerRequest],
  bookingsController.adminAssignPartner,
);

/**
 * @openapi
 * /admin/bookings/{id}/assignable-partners:
 *   get:
 *     tags:
 *       - admin-bookings
 *     summary: List partners eligible for manual assignment
 *     description: >
 *       Returns approved partners with the required service skill who do not
 *       have an overlapping active booking for the same time window.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assignable partners returned
 *       404:
 *         description: Booking not found
 */
adminRoutes.get(
  "/bookings/:id/assignable-partners",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  bookingsController.listAssignablePartnersForBooking,
);

export default adminRoutes;
