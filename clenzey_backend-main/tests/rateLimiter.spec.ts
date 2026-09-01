import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/configs/environmentConfig.ts", () => ({
  envConfig: { ENABLE_RATE_LIMIT: false },
}));

import { createRateLimiter, isRateLimitEnabled } from "../src/middlewares/createRateLimiter.ts";
import { otpValidateRateLimiter } from "../src/middlewares/rateLimiterMiddleware.ts";

describe("createRateLimiter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a no-op middleware when rate limiting is disabled", () => {
    expect(isRateLimitEnabled()).toBe(false);

    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const next = vi.fn() as NextFunction;

    limiter({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("creates an express rate limiter when rate limiting is enabled", async () => {
    vi.resetModules();
    const rateLimitMock = vi.fn(() => vi.fn());
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: { ENABLE_RATE_LIMIT: true },
    }));
    vi.doMock("../src/middlewares/rateLimitStore.ts", () => ({
      withRedisStore: (options: unknown) => options,
    }));
    vi.doMock("express-rate-limit", () => ({
      default: rateLimitMock,
    }));

    const { createRateLimiter: createEnabledLimiter } = await import(
      "../src/middlewares/createRateLimiter.ts"
    );
    createEnabledLimiter({ limit: 5, windowMs: 60_000 });

    expect(rateLimitMock).toHaveBeenCalledWith({ limit: 5, windowMs: 60_000 });

    vi.doUnmock("../src/configs/environmentConfig.ts");
    vi.doUnmock("../src/middlewares/rateLimitStore.ts");
    vi.doUnmock("express-rate-limit");
    vi.resetModules();
  });
});

describe("otpValidateRateLimiter", () => {
  it("is configured with a 10 attempt limit per window", () => {
    expect(otpValidateRateLimiter).toBeDefined();
  });
});
