import type { Request, RequestHandler } from "express";

import { HttpStatusCode } from "axios";
import { ipKeyGenerator } from "express-rate-limit";

import ErrorCode from "../errors/errorCode.ts";
import ErrorMsg from "../errors/errorMsg.ts";
import { sendResponse } from "../utilities/commonUtils.ts";
import { createRateLimiter } from "./createRateLimiter.ts";

const buildRateLimitHandler = (message = ErrorMsg.RATE_LIMIT_EXCEEDED) => {
  return (_req: Request, res: Parameters<typeof sendResponse>[0]) => {
    return sendResponse(res, {
      error: {
        code: ErrorCode.RATE_LIMIT_ERROR,
      },
      message,
      statusCode: HttpStatusCode.TooManyRequests,
    });
  };
};

export const apiReqestlimiter: RequestHandler = createRateLimiter({
  handler: buildRateLimitHandler(),
  ipv6Subnet: 56,
  legacyHeaders: false,
  limit: 100,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

export const otpReqestlimiter: RequestHandler = createRateLimiter({
  handler: buildRateLimitHandler(
    "Too many OTP requests. Please try again later.",
  ),
  keyGenerator: (req) => {
    const phone = req.body.phone ?? req.body.phoneNumber;

    return ipKeyGenerator(phone ? `phone:${phone}` : `ip:${req.ip}`, 56);
  },
  legacyHeaders: false,
  limit: 5,
  standardHeaders: true,
  windowMs: 5 * 60 * 1000,
});

export const geocodingRequestLimiter: RequestHandler = createRateLimiter({
  handler: buildRateLimitHandler(
    "Too many geocoding requests. Please try again later.",
  ),
  keyGenerator: (req) => {
    const userId = req.user?.sub;
    return ipKeyGenerator(userId ? `user:${userId}` : `ip:${req.ip}`, 56);
  },
  legacyHeaders: false,
  limit: 30,
  standardHeaders: true,
  windowMs: 60 * 1000,
});

export const otpValidateRateLimiter: RequestHandler = createRateLimiter({
  handler: buildRateLimitHandler(
    "Too many OTP verification attempts. Please try again later.",
  ),
  keyGenerator: (req) => {
    const token = req.body?.token;
    const tokenKey =
      typeof token === "string" && token.length > 0 ? token.slice(0, 32) : "none";
    return ipKeyGenerator(`otp-validate:${tokenKey}:${req.ip}`, 56);
  },
  legacyHeaders: false,
  limit: 10,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});
