import type { Request, RequestHandler } from "express";

import { HttpStatusCode } from "axios";
import { ipKeyGenerator } from "express-rate-limit";

import ErrorCode from "../errors/errorCode.ts";
import { sendResponse } from "../utilities/commonUtils.ts";
import { createRateLimiter } from "./createRateLimiter.ts";

const buildLoginHandler = (
  message = "Too many failed attempts. Please try again later.",
) => {
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

export const loginRateLimiter: RequestHandler = createRateLimiter({
  handler: buildLoginHandler(),
  keyGenerator: (req) => {
    const identifier = req.body.identifier;
    return ipKeyGenerator(
      identifier ? `login:${identifier}` : `ip:${req.ip}`,
      56,
    );
  },
  legacyHeaders: false,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

export const adminLoginRateLimiter: RequestHandler = createRateLimiter({
  handler: buildLoginHandler(),
  keyGenerator: (req) => {
    const username = req.body.username;
    return ipKeyGenerator(
      username ? `admin-login:${username}` : `ip:${req.ip}`,
      56,
    );
  },
  legacyHeaders: false,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

export const ipAuthRateLimiter: RequestHandler = createRateLimiter({
  handler: (_req: Request, res) => {
    return sendResponse(res, {
      error: {
        code: ErrorCode.RATE_LIMIT_ERROR,
      },
      message: "Too many requests. Please try again later.",
      statusCode: HttpStatusCode.TooManyRequests,
    });
  },
  legacyHeaders: false,
  limit: 100,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});
