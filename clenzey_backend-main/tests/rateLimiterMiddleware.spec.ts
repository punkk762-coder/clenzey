import type { Options } from "express-rate-limit";
import type { Request } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isRateLimitEnabled } from "../src/middlewares/createRateLimiter.ts";
import {
  apiReqestlimiter,
  geocodingRequestLimiter,
  otpReqestlimiter,
  otpValidateRateLimiter,
} from "../src/middlewares/rateLimiterMiddleware.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

const assertNoOpLimiter = (
  limiter: (typeof apiReqestlimiter),
  name: string,
) => {
  it(`${name} passes through when rate limiting is disabled`, () => {
    const next = mockNext();
    limiter(mockRequest(), mockResponse(), next);
    expect(next).toHaveBeenCalledOnce();
  });
};

describe("rateLimiterMiddleware no-ops", () => {
  it("has rate limiting disabled in the vitest environment", () => {
    expect(isRateLimitEnabled()).toBe(false);
  });

  assertNoOpLimiter(apiReqestlimiter, "apiReqestlimiter");
  assertNoOpLimiter(otpReqestlimiter, "otpReqestlimiter");
  assertNoOpLimiter(geocodingRequestLimiter, "geocodingRequestLimiter");
  assertNoOpLimiter(otpValidateRateLimiter, "otpValidateRateLimiter");
});

describe("rateLimiterMiddleware keyGenerator", () => {
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
    await import("../src/middlewares/rateLimiterMiddleware.ts");
    return capturedOptions;
  };

  it("otpReqestlimiter keys by phone when present", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[1]?.keyGenerator;
    expect(keyGenerator).toBeTypeOf("function");

    const req = mockRequest({
      body: { phone: "+919999999999" },
      ip: "10.0.0.1",
    });
    const key = keyGenerator!(req);
    expect(key).toContain("phone:+919999999999");
  });

  it("otpReqestlimiter keys by phoneNumber when phone is absent", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[1]?.keyGenerator;

    const req = mockRequest({
      body: { phoneNumber: "+918888877777" },
      ip: "10.0.0.1",
    });
    const key = keyGenerator!(req);
    expect(key).toContain("phone:+918888877777");
  });

  it("otpReqestlimiter falls back to ip when no phone is provided", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[1]?.keyGenerator;

    const req = mockRequest({ body: {}, ip: "10.0.0.2" });
    const key = keyGenerator!(req);
    expect(key).toContain("ip:10.0.0.2");
  });

  it("geocodingRequestLimiter keys by user id when authenticated", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[2]?.keyGenerator;

    const req = mockRequest({
      ip: "10.0.0.3",
      user: { sub: "user-123" } as Request["user"],
    });
    const key = keyGenerator!(req);
    expect(key).toContain("user:user-123");
  });

  it("geocodingRequestLimiter falls back to ip for unauthenticated requests", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[2]?.keyGenerator;

    const req = mockRequest({ ip: "10.0.0.4" });
    const key = keyGenerator!(req);
    expect(key).toContain("ip:10.0.0.4");
  });

  it("otpValidateRateLimiter keys by token prefix and ip", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[3]?.keyGenerator;

    const token = "a".repeat(40);
    const req = mockRequest({
      body: { token },
      ip: "10.0.0.5",
    });
    const key = keyGenerator!(req);
    expect(key).toContain(`otp-validate:${"a".repeat(32)}:10.0.0.5`);
  });

  it("otpValidateRateLimiter uses none when token is missing", async () => {
    const options = await loadLimiters();
    const keyGenerator = options[3]?.keyGenerator;

    const req = mockRequest({ body: {}, ip: "10.0.0.6" });
    const key = keyGenerator!(req);
    expect(key).toContain("otp-validate:none:10.0.0.6");
  });
});
