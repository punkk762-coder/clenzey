import type { Options } from "express-rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isRateLimitEnabled } from "../src/middlewares/createRateLimiter.ts";
import {
  adminLoginRateLimiter,
  ipAuthRateLimiter,
  loginRateLimiter,
} from "../src/middlewares/loginRateLimiter.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

const assertNoOpLimiter = (
  limiter: (typeof loginRateLimiter),
  name: string,
) => {
  it(`${name} passes through when rate limiting is disabled`, () => {
    const next = mockNext();
    limiter(mockRequest(), mockResponse(), next);
    expect(next).toHaveBeenCalledOnce();
  });
};

describe("loginRateLimiter no-ops", () => {
  it("has rate limiting disabled in the vitest environment", () => {
    expect(isRateLimitEnabled()).toBe(false);
  });

  assertNoOpLimiter(loginRateLimiter, "loginRateLimiter");
  assertNoOpLimiter(adminLoginRateLimiter, "adminLoginRateLimiter");
  assertNoOpLimiter(ipAuthRateLimiter, "ipAuthRateLimiter");
});

describe("loginRateLimiter keyGenerator", () => {
  let capturedOptions: Partial<Options>[] = [];

  beforeEach(() => {
    vi.resetModules();
    capturedOptions = [];

    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: { ENABLE_RATE_LIMIT: true },
    }));
    vi.doMock("../src/middlewares/rateLimitStore.ts", () => ({
      withRedisStore: (options: unknown) => options,
    }));
    vi.doMock("express-rate-limit", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("express-rate-limit")>();
      return {
        ...original,
        default: (options: Partial<Options>) => {
          capturedOptions.push(options);
          return vi.fn((_req, _res, next) => next());
        },
      };
    });
  });

  afterEach(() => {
    vi.doUnmock("../src/configs/environmentConfig.ts");
    vi.doUnmock("../src/middlewares/rateLimitStore.ts");
    vi.doUnmock("express-rate-limit");
    vi.resetModules();
  });

  const loadLimiters = async () => {
    await import("../src/middlewares/loginRateLimiter.ts");
    return capturedOptions;
  };

  it("loginRateLimiter keys by identifier when provided", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[0]?.keyGenerator;
    expect(keyGenerator).toBeTypeOf("function");

    const req = mockRequest({
      body: { identifier: "user@example.com" },
      ip: "10.0.0.1",
    });
    const key = keyGenerator!(req);
    expect(key).toContain("login:user@example.com");
  });

  it("loginRateLimiter falls back to ip when identifier is absent", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[0]?.keyGenerator;

    const req = mockRequest({ body: {}, ip: "10.0.0.2" });
    const key = keyGenerator!(req);
    expect(key).toContain("ip:10.0.0.2");
  });

  it("adminLoginRateLimiter keys by username when provided", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[1]?.keyGenerator;

    const req = mockRequest({
      body: { username: "admin" },
      ip: "10.0.0.3",
    });
    const key = keyGenerator!(req);
    expect(key).toContain("admin-login:admin");
  });

  it("adminLoginRateLimiter falls back to ip when username is absent", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[1]?.keyGenerator;

    const req = mockRequest({ body: {}, ip: "10.0.0.4" });
    const key = keyGenerator!(req);
    expect(key).toContain("ip:10.0.0.4");
  });

  it("ipAuthRateLimiter uses default ip-based limiting without a custom keyGenerator", async () => {
    const options = await loadLimiters();
    expect(options[2]?.keyGenerator).toBeUndefined();
    expect(options[2]?.limit).toBe(100);
  });

  it("invokes rate-limit handlers when requests are blocked", async () => {
    const options = await loadLimiters();
    const loginHandler = options[0]?.handler;
    const adminHandler = options[1]?.handler;
    const ipHandler = options[2]?.handler;

    const res = mockResponse();
    loginHandler?.(mockRequest(), res, mockNext());
    adminHandler?.(mockRequest(), res, mockNext());
    ipHandler?.(mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(429);
  });
});
