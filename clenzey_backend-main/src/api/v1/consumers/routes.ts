import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import {
  ipAuthRateLimiter,
  loginRateLimiter,
} from "../../../middlewares/loginRateLimiter.ts";
import {
  consumerPasswordSignIn,
  consumerPasswordSignUp,
} from "./authPasswordControllers.ts";
import {
  consumerSignUpValidation,
  signInValidation,
} from "./authPasswordValidations.ts";
import * as consumerController from "./controllers.ts";
import * as consumerValidation from "./validations.ts";

const consumerRoutes: Router = express.Router();

/**
 * @openapi
 * /consumers/auth/firebase:
 *   post:
 *     tags:
 *       - consumer-auth
 *     summary: Sign in with Firebase phone authentication
 *     description: >
 *       Exchanges a Firebase ID token (from client-side phone OTP verification)
 *       for Clenzey JWT access and refresh tokens. Creates a new consumer account
 *       on first sign-in (`isNewUser: true`). Mobile clients should send
 *       `X-Client-Platform: ios|android|mobile` to receive refresh tokens in JSON.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerFirebaseAuthRequest'
 *     responses:
 *       200:
 *         description: Existing consumer signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsumerAuthResponse'
 *       201:
 *         description: New consumer account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsumerAuthResponse'
 *       401:
 *         description: Invalid or expired Firebase token
 *       422:
 *         description: Validation error (invalid phone in token)
 *       429:
 *         description: Rate limit exceeded
 */
consumerRoutes.post(
  "/auth/firebase",
  [consumerValidation.firebaseAuthRequest, ipAuthRateLimiter],
  consumerController.consumerAuthFirebase,
);

/**
 * @openapi
 * /consumers/auth/refresh:
 *   post:
 *     tags:
 *       - consumer-auth
 *     summary: Refresh access token
 *     description: >
 *       Issues a new access token using the `rft_consumer` HttpOnly cookie (web)
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
consumerRoutes.post(
  "/auth/refresh",
  [consumerValidation.refreshTokenRequest],
  consumerController.consumerAuthRefresh,
);

/**
 * @openapi
 * /consumers/auth/logout:
 *   post:
 *     tags:
 *       - consumer-auth
 *     summary: Log out
 *     description: Clears the `rft_consumer` HttpOnly cookie, invalidating the session.
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
consumerRoutes.post("/auth/logout", consumerController.consumerAuthLogout);

/**
 * @openapi
 * /consumers/auth/signup:
 *   post:
 *     tags:
 *       - consumer-auth
 *     summary: Sign up with email and password
 *     description: >
 *       Creates a new consumer account using email, phone, and password.
 *       Returns a short-lived JWT access token (15 min) and sets an
 *       `rft_consumer` HttpOnly cookie with a 30-day refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerPasswordSignUpRequest'
 *     responses:
 *       201:
 *         description: Consumer account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsumerPasswordSignUpResponse'
 *       409:
 *         description: Email or phone already registered
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
consumerRoutes.post(
  "/auth/signup",
  [consumerSignUpValidation, ipAuthRateLimiter],
  consumerPasswordSignUp,
);

/**
 * @openapi
 * /consumers/auth/signin:
 *   post:
 *     tags:
 *       - consumer-auth
 *     summary: Sign in with email/phone and password
 *     description: >
 *       Authenticates a consumer using email or phone number and password.
 *       Returns a short-lived JWT access token (15 min) and sets an
 *       `rft_consumer` HttpOnly cookie with a 30-day refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInRequest'
 *     responses:
 *       200:
 *         description: Consumer signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsumerSignInResponse'
 *       401:
 *         description: Invalid credentials
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded (brute-force protection)
 */
consumerRoutes.post(
  "/auth/signin",
  [signInValidation, loginRateLimiter],
  consumerPasswordSignIn,
);

/**
 * @openapi
 * /consumers/me:
 *   get:
 *     tags:
 *       - consumer-profile
 *     summary: Get my profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consumer profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consumer:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     phone: { type: string }
 *                     fullName: { type: string, nullable: true }
 *                     referralCode: { type: string, nullable: true }
 *                     profileImage: { type: string, format: uri, nullable: true }
 *       401:
 *         description: Unauthorized
 */
consumerRoutes.get("/me", [requireAuth(["CONSUMER"])], consumerController.getConsumer);

/**
 * @openapi
 * /consumers/me:
 *   patch:
 *     tags:
 *       - consumer-profile
 *     summary: Update my profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Priya Sharma"
 *               profileImage: { type: string, format: uri, nullable: true }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consumer:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     phone: { type: string }
 *                     fullName: { type: string, nullable: true }
 *                     referralCode: { type: string, nullable: true }
 *                     profileImage: { type: string, format: uri, nullable: true }
 */
consumerRoutes.patch("/me", [requireAuth(["CONSUMER"]), consumerValidation.updateProfileRequest], consumerController.updateConsumer);

/**
 * @openapi
 * /consumers/me:
 *   delete:
 *     tags:
 *       - consumer-profile
 *     summary: Delete my account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       409:
 *         description: Active bookings prevent deletion
 */
consumerRoutes.delete("/me", [requireAuth(["CONSUMER"])], consumerController.deleteConsumer);

export default consumerRoutes;
