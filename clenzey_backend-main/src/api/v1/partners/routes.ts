import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireApprovedPartner } from "../../../middlewares/requireApprovedPartnerMiddleware.ts";
import {
  ipAuthRateLimiter,
  loginRateLimiter,
} from "../../../middlewares/loginRateLimiter.ts";
import * as partnerPasswordController from "./authPasswordControllers.ts";
import {
  partnerSignUpValidation,
  signInValidation,
} from "./authPasswordValidations.ts";
import * as partnerController from "./controllers.ts";
import * as partnerValidation from "./validations.ts";

const partnerRoutes: Router = express.Router();

/**
 * @openapi
 * /partners/auth/firebase:
 *   post:
 *     tags:
 *       - partner-auth
 *     summary: Sign in with Firebase phone authentication
 *     description: >
 *       Exchanges a Firebase ID token (from client-side phone OTP verification)
 *       for Clenzey JWT access and refresh tokens. Creates a new partner account
 *       on first sign-in (`isNewPartner: true`) — provide `fullName` when registering
 *       for the first time. New partners start with `approvalStatus: PENDING`.
 *       Mobile clients should send `X-Client-Platform: ios|android|mobile` to
 *       receive refresh tokens in JSON.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PartnerFirebaseAuthRequest'
 *           examples:
 *             newPartner:
 *               summary: First-time sign-up
 *               value:
 *                 idToken: "eyJhbGciOiJSUzI1NiIs..."
 *                 fullName: "Amit Sharma"
 *             returningPartner:
 *               summary: Returning partner
 *               value:
 *                 idToken: "eyJhbGciOiJSUzI1NiIs..."
 *     responses:
 *       200:
 *         description: Existing partner signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PartnerAuthResponse'
 *       201:
 *         description: New partner account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PartnerAuthResponse'
 *       401:
 *         description: Invalid or expired Firebase token
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
partnerRoutes.post(
  "/auth/firebase",
  [partnerValidation.firebaseAuthRequest, ipAuthRateLimiter],
  partnerController.partnerAuthFirebase,
);

/**
 * @openapi
 * /partners/auth/refresh:
 *   post:
 *     tags:
 *       - partner-auth
 *     summary: Refresh access token
 *     description: >
 *       Issues a new access token using the `rft_partner` HttpOnly cookie (web)
 *       or a JSON `refreshToken` body field (mobile).
 *       Mobile clients must send `X-Client-Platform: ios|android|mobile` on
 *       sign-in to receive a refresh token in JSON; send that token here on refresh.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Required for native apps when the HttpOnly cookie is unavailable.
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenRefreshResponse'
 *       401:
 *         description: Refresh token cookie missing or expired
 */
partnerRoutes.post(
  "/auth/refresh",
  [partnerValidation.refreshTokenRequest],
  partnerController.partnerAuthRefresh,
);

/**
 * @openapi
 * /partners/me:
 *   get:
 *     tags:
 *       - partner-profile
 *     summary: Get my partner profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partner profile
 */
partnerRoutes.get(
  "/me",
  [requireAuth(["PARTNER"])],
  partnerController.getPartnerProfile,
);

/**
 * @openapi
 * /partners/me:
 *   patch:
 *     tags:
 *       - partner-profile
 *     summary: Update my partner profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string, minLength: 2, maxLength: 100 }
 *               bio: { type: string, maxLength: 500, nullable: true }
 *               dob: { type: string, format: date, nullable: true }
 *               gender: { type: string, enum: [male, female, other], nullable: true }
 *               languages:
 *                 type: array
 *                 maxItems: 10
 *                 items: { type: string }
 *               experienceYears: { type: integer, minimum: 0, maximum: 50, nullable: true }
 *               profileImage: { type: string, format: uri, nullable: true }
 *     responses:
 *       200:
 *         description: Profile updated
 */
partnerRoutes.patch(
  "/me",
  [
    requireAuth(["PARTNER"]),
    partnerValidation.updatePartnerProfileRequest,
  ],
  partnerController.updatePartnerProfile,
);

/**
 * @openapi
 * /partners/auth/logout:
 *   post:
 *     tags:
 *       - partner-auth
 *     summary: Log out
 *     description: Clears the `rft_partner` HttpOnly cookie, invalidating the session.
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
partnerRoutes.post("/auth/logout", partnerController.partnerAuthLogout);

// ── Password-based auth ──────────────────────────────────────────────────────

/**
 * @openapi
 * /partners/auth/signup:
 *   post:
 *     tags:
 *       - partner-auth
 *     summary: Register with email and password
 *     description: >
 *       Creates a new partner account using email, phone, password, and fullName.
 *       New partners start with `approvalStatus: PENDING`.
 *       Returns a short-lived JWT access token and sets an
 *       `rft_partner` HttpOnly cookie with a 30-day refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PartnerSignUpRequest'
 *     responses:
 *       201:
 *         description: Partner account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PartnerSignUpResponse'
 *       409:
 *         description: Email or phone already registered
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
partnerRoutes.post(
  "/auth/signup",
  [partnerSignUpValidation, ipAuthRateLimiter],
  partnerPasswordController.partnerPasswordSignUp,
);

/**
 * @openapi
 * /partners/auth/signin:
 *   post:
 *     tags:
 *       - partner-auth
 *     summary: Sign in with email/phone and password
 *     description: >
 *       Authenticates a partner using email or phone as identifier plus password.
 *       Returns a short-lived JWT access token and sets an
 *       `rft_partner` HttpOnly cookie with a 30-day refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInRequest'
 *     responses:
 *       200:
 *         description: Partner signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PartnerSignInResponse'
 *       401:
 *         description: Invalid credentials
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded (too many failed attempts)
 */
partnerRoutes.post(
  "/auth/signin",
  [signInValidation, loginRateLimiter],
  partnerPasswordController.partnerPasswordSignIn,
);

// ── Availability & location ──────────────────────────────────────────────────

/**
 * @openapi
 * /partners/availability:
 *   get:
 *     tags:
 *       - partner-availability
 *     summary: List my weekly availability windows
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of availability rows
 */
partnerRoutes.get(
  "/availability",
  [requireAuth(["PARTNER"])],
  partnerController.listAvailability,
);

/**
 * @openapi
 * /partners/availability:
 *   post:
 *     tags:
 *       - partner-availability
 *     summary: Add an availability window
 *     description: A recurring window like Mon 09:00–18:00.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayOfWeek, startHour, endHour]
 *             properties:
 *               dayOfWeek:
 *                 type: string
 *                 enum: [SUN, MON, TUE, WED, THU, FRI, SAT]
 *               startHour: { type: integer, minimum: 0, maximum: 23 }
 *               endHour: { type: integer, minimum: 1, maximum: 24 }
 *     responses:
 *       201:
 *         description: Availability added
 *       422:
 *         description: Validation error
 */
partnerRoutes.post(
  "/availability",
  [
    requireAuth(["PARTNER"]),
    requireApprovedPartner,
    partnerValidation.createAvailabilityRequest,
  ],
  partnerController.createAvailability,
);

/**
 * @openapi
 * /partners/availability/{availabilityId}:
 *   delete:
 *     tags:
 *       - partner-availability
 *     summary: Remove an availability window
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: availabilityId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Removed
 */
partnerRoutes.delete(
  "/availability/:availabilityId",
  [requireAuth(["PARTNER"]), requireApprovedPartner],
  partnerController.deleteAvailability,
);

/**
 * @openapi
 * /partners/location:
 *   post:
 *     tags:
 *       - partner-availability
 *     summary: Update current location (online ping)
 *     description: >
 *       Upserts the partner's location and marks them online by default.
 *       Used during instant booking dispatch.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude: { type: number, minimum: -90, maximum: 90 }
 *               longitude: { type: number, minimum: -180, maximum: 180 }
 *               heading: { type: number, minimum: 0, maximum: 360 }
 *               speed: { type: number, minimum: 0 }
 *               isOnline: { type: boolean }
 *     responses:
 *       200:
 *         description: Location updated
 */
partnerRoutes.post(
  "/location",
  [
    requireAuth(["PARTNER"]),
    requireApprovedPartner,
    partnerValidation.locationPingRequest,
  ],
  partnerController.pingLocation,
);

/**
 * @openapi
 * /partners/online:
 *   post:
 *     tags:
 *       - partner-availability
 *     summary: Toggle online status (without sending coordinates)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isOnline]
 *             properties:
 *               isOnline: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
partnerRoutes.post(
  "/online",
  [
    requireAuth(["PARTNER"]),
    requireApprovedPartner,
    partnerValidation.onlineStatusRequest,
  ],
  partnerController.setOnline,
);

export default partnerRoutes;
