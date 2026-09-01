import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import ErrorCode from "../errors/errorCode.ts";
import ErrorMsg from "../errors/errorMsg.ts";
import { isRateLimitEnabled } from "./createRateLimiter.ts";
import { getCooldownStore } from "../stores/redisCooldownStore.ts";
import { memoryCooldownStore } from "../stores/memoryCooldownStore.ts";
import { sendResponse } from "../utilities/commonUtils.ts";

type CooldownStore = {
  get: (key: string) => Promise<null | number>;
  set: (key: string, value: number, ttlMs: number) => Promise<void>;
};

const createOtpCooldown = (store: CooldownStore): RequestHandler => {
  const COOLDOWN_MS = 30 * 1000;

  return async (req, res, next) => {
    try {
      const phone = req.body?.phone;

      if (!phone || typeof phone !== "string") {
        return sendResponse(res, {
          error: {
            code: ErrorCode.BAD_REQUEST_ERROR,
            details: { field: "phone", message: "Phone is required" },
          },
          message: ErrorMsg.BAD_REQUEST,
          statusCode: HttpStatusCode.BadRequest,
        });
      }

      const key = `otp:cooldown:${phone}`;
      const last = await store.get(key);

      if (last !== null) {
        return sendResponse(res, {
          error: {
            code: ErrorCode.RATE_LIMIT_ERROR,
          },
          message: "Please wait before requesting another OTP",
          statusCode: HttpStatusCode.TooManyRequests,
        });
      }

      await store.set(key, Date.now(), COOLDOWN_MS);
      next();
    } catch (err) {
      next(err);
    }
  };
};

const resolveCooldownStore = (): CooldownStore =>
  getCooldownStore() ?? memoryCooldownStore;

export const otpCooldownMiddleware: RequestHandler = (req, res, next) => {
  if (!isRateLimitEnabled()) {
    return next();
  }

  return createOtpCooldown(resolveCooldownStore())(req, res, next);
};
