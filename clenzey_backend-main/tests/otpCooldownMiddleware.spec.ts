import { HttpStatusCode } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { otpCooldownMiddleware } from "../src/middlewares/otpCooldownMiddleware.ts";
import * as rateLimiter from "../src/middlewares/createRateLimiter.ts";
import { memoryCooldownStore } from "../src/stores/memoryCooldownStore.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("otpCooldownMiddleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a no-op when rate limiting is disabled", async () => {
    const next = mockNext();
    await otpCooldownMiddleware(
      mockRequest({ body: { phone: "+919999999999" } }),
      mockResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("requires a phone number when rate limiting is enabled", async () => {
    vi.spyOn(rateLimiter, "isRateLimitEnabled").mockReturnValue(true);
    const res = mockResponse();
    const next = mockNext();

    await otpCooldownMiddleware(mockRequest({ body: {} }), res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.BadRequest);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks repeat OTP requests during the cooldown window", async () => {
    vi.spyOn(rateLimiter, "isRateLimitEnabled").mockReturnValue(true);
    const phone = "+919777766666";
    await memoryCooldownStore.set(`otp:cooldown:${phone}`, Date.now(), 30_000);

    const res = mockResponse();
    const next = mockNext();
    await otpCooldownMiddleware(mockRequest({ body: { phone } }), res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.TooManyRequests);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows the first OTP request and stores a cooldown key", async () => {
    vi.spyOn(rateLimiter, "isRateLimitEnabled").mockReturnValue(true);
    const phone = "+919666655555";
    const next = mockNext();

    await otpCooldownMiddleware(
      mockRequest({ body: { phone } }),
      mockResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith();
    expect(await memoryCooldownStore.get(`otp:cooldown:${phone}`)).not.toBeNull();
  });
});

describe("otp cooldown store behavior", () => {
  it("tracks cooldown keys in memory store", async () => {
    const key = `otp:cooldown:+919888877777`;
    await memoryCooldownStore.set(key, Date.now(), 30_000);
    expect(await memoryCooldownStore.get(key)).not.toBeNull();
  });
});
