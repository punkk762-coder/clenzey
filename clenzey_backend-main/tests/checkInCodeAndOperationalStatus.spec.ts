import { describe, expect, it, beforeEach } from "vitest";

import {
  codesMatch,
  generateCheckInCode,
  isCheckInCodeUniqueViolation,
  withUniqueCheckInCode,
} from "../src/api/v1/bookings/checkInCode.ts";
import { _testing as rateLimitTesting } from "../src/api/v1/bookings/verifyStartRateLimit.ts";
import {
  assertVerifyStartAllowed,
  lockBookingAfterFailedAttempts,
} from "../src/api/v1/bookings/verifyStartRateLimit.ts";
import { canTransition } from "../src/api/v1/bookings/stateMachine.ts";
import { sanitizeBookingCheckInCode } from "../src/api/v1/bookings/sanitizeBooking.ts";
import { _testing as statusTesting } from "../src/api/v1/partners/operationalStatus.ts";

describe("checkInCode", () => {
  it("generates 4-digit codes in 1000-9999", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateCheckInCode();
      expect(code).toMatch(/^\d{4}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(1000);
      expect(Number(code)).toBeLessThanOrEqual(9999);
    }
  });

  it("compares codes in a timing-safe way", () => {
    expect(codesMatch("4821", "4821")).toBe(true);
    expect(codesMatch("4821", "4822")).toBe(false);
  });

  it("retries on unique violation then succeeds", async () => {
    let attempts = 0;
    const result = await withUniqueCheckInCode(async (code) => {
      attempts += 1;
      if (attempts < 3) {
        const err = new Error("duplicate") as Error & { code: string; constraint: string };
        err.code = "23505";
        err.constraint = "bookings_active_check_in_code_uidx";
        throw err;
      }
      return code;
    });
    expect(attempts).toBe(3);
    expect(result).toMatch(/^\d{4}$/);
  });

  it("detects unique violation errors", () => {
    const err = new Error("dup") as Error & { code: string; constraint: string };
    err.code = "23505";
    err.constraint = "bookings_active_check_in_code_uidx";
    expect(isCheckInCodeUniqueViolation(err)).toBe(true);
  });
});

describe("state machine verify-start gates", () => {
  it("allows admin EN_ROUTE → IN_PROGRESS", () => {
    expect(
      canTransition("PROFESSIONAL_EN_ROUTE", "IN_PROGRESS", "ADMIN"),
    ).toBe(true);
  });

  it("does not allow partner EN_ROUTE → IN_PROGRESS via generic transition", () => {
    expect(
      canTransition("PROFESSIONAL_EN_ROUTE", "IN_PROGRESS", "PARTNER"),
    ).toBe(false);
  });
});

describe("sanitizeBookingCheckInCode", () => {
  const booking = {
    checkInCode: "4821",
    status: "PROFESSIONAL_EN_ROUTE" as const,
  };

  it("hides code from partners", () => {
    expect(sanitizeBookingCheckInCode(booking, "PARTNER").checkInCode).toBeUndefined();
  });

  it("shows code to consumers when en route", () => {
    expect(sanitizeBookingCheckInCode(booking, "CONSUMER").checkInCode).toBe("4821");
  });

  it("hides code from consumers before assignment", () => {
    expect(
      sanitizeBookingCheckInCode(
        { checkInCode: "4821", status: "CONFIRMED" as const },
        "CONSUMER",
      ).checkInCode,
    ).toBeUndefined();
  });

  it("shows code to admin", () => {
    expect(sanitizeBookingCheckInCode(booking, "ADMIN").checkInCode).toBe("4821");
  });
});

describe("verifyStartRateLimit", () => {
  beforeEach(() => {
    rateLimitTesting.clearMemory();
  });

  it("locks booking after max failed attempts", async () => {
    await lockBookingAfterFailedAttempts("b1", rateLimitTesting.BOOKING_MAX_ATTEMPTS);
    await expect(
      assertVerifyStartAllowed({ attempts: 0, bookingId: "b1", partnerId: "p1" }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe("operationalStatus deriveStatus", () => {
  const { deriveStatus } = statusTesting;
  const now = new Date("2026-07-13T12:00:00.000Z");

  it("returns OFFLINE when not online", () => {
    expect(
      deriveStatus({
        bookingStatus: null,
        isOnline: false,
        lastSeenAt: now,
        now,
      }),
    ).toBe("OFFLINE");
  });

  it("returns OFFLINE when last seen is stale", () => {
    expect(
      deriveStatus({
        bookingStatus: null,
        isOnline: true,
        lastSeenAt: new Date(now.getTime() - 6 * 60 * 1000),
        now,
      }),
    ).toBe("OFFLINE");
  });

  it("returns IN_TRANSIT when en route", () => {
    expect(
      deriveStatus({
        bookingStatus: "PROFESSIONAL_EN_ROUTE",
        isOnline: true,
        lastSeenAt: now,
        now,
      }),
    ).toBe("IN_TRANSIT");
  });

  it("returns ON_JOB when in progress", () => {
    expect(
      deriveStatus({
        bookingStatus: "IN_PROGRESS",
        isOnline: true,
        lastSeenAt: now,
        now,
      }),
    ).toBe("ON_JOB");
  });

  it("returns IDLE when online with no active booking", () => {
    expect(
      deriveStatus({
        bookingStatus: null,
        isOnline: true,
        lastSeenAt: now,
        now,
      }),
    ).toBe("IDLE");
  });
});
