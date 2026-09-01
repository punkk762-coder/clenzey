import { describe, expect, it } from "vitest";

import { dispatchJobId, DISPATCH_QUEUE_NAMES } from "../src/queues/dispatchQueue.ts";

describe("admin job ID format", () => {
  it("includes admin suffix to avoid collision with automatic jobs", () => {
    const bookingId = "550e8400-e29b-41d4-a716-446655440000";
    const adminId = "660e8400-e29b-41d4-a716-446655440001";
    const jobId = dispatchJobId(
      "instant",
      bookingId,
      "admin",
      `${adminId.slice(0, 8)}_${Date.now()}`,
    );
    expect(jobId).toContain("_admin_");
    expect(jobId).toContain(bookingId);
  });
});

describe("instant dispatch eligibility rules", () => {
  const isInstantEligible = (booking: {
    bookingType: string;
    partnerId: string | null;
    status: string;
  }) =>
    booking.bookingType === "INSTANT" &&
    booking.status === "CONFIRMED" &&
    !booking.partnerId;

  it("allows CONFIRMED instant booking without partner", () => {
    expect(
      isInstantEligible({
        bookingType: "INSTANT",
        partnerId: null,
        status: "CONFIRMED",
      }),
    ).toBe(true);
  });

  it("rejects scheduled bookings", () => {
    expect(
      isInstantEligible({
        bookingType: "SCHEDULED",
        partnerId: null,
        status: "CONFIRMED",
      }),
    ).toBe(false);
  });

  it("rejects already assigned bookings", () => {
    expect(
      isInstantEligible({
        bookingType: "INSTANT",
        partnerId: "partner-1",
        status: "CONFIRMED",
      }),
    ).toBe(false);
  });
});

describe("scheduled assign eligibility rules", () => {
  const isScheduledAssignEligible = (booking: {
    bookingType: string;
    partnerId: string | null;
    status: string;
  }) =>
    booking.bookingType === "SCHEDULED" &&
    booking.status === "CONFIRMED" &&
    !booking.partnerId;

  it("allows CONFIRMED scheduled booking without partner", () => {
    expect(
      isScheduledAssignEligible({
        bookingType: "SCHEDULED",
        partnerId: null,
        status: "CONFIRMED",
      }),
    ).toBe(true);
  });
});

describe("revalidate eligibility rules", () => {
  const isRevalidateEligible = (booking: {
    bookingType: string;
    partnerId: string | null;
    status: string;
  }) =>
    booking.bookingType === "SCHEDULED" &&
    Boolean(booking.partnerId) &&
    ["CONFIRMED", "PROFESSIONAL_ASSIGNED"].includes(booking.status);

  it("allows scheduled booking with assigned partner", () => {
    expect(
      isRevalidateEligible({
        bookingType: "SCHEDULED",
        partnerId: "partner-1",
        status: "PROFESSIONAL_ASSIGNED",
      }),
    ).toBe(true);
  });

  it("rejects unassigned scheduled booking", () => {
    expect(
      isRevalidateEligible({
        bookingType: "SCHEDULED",
        partnerId: null,
        status: "CONFIRMED",
      }),
    ).toBe(false);
  });
});

describe("failed job DTO shape", () => {
  it("maps BullMQ job fields to stable admin response", () => {
    const dto = {
      attemptsMade: 3,
      bookingId: "abc-123",
      failedReason: "timeout",
      finishedOn: "2026-06-26T10:00:00.000Z",
      id: "42",
      name: "instant",
      payload: { bookingId: "abc-123" },
      queue: DISPATCH_QUEUE_NAMES.INSTANT,
      timestamp: "2026-06-26T09:59:00.000Z",
    };

    expect(dto.queue).toBe("dispatch-instant");
    expect(dto.bookingId).toBe("abc-123");
    expect(dto.failedReason).toBe("timeout");
  });
});
