import { describe, expect, it, vi } from "vitest";

import {
  resolveDispatchMetadata,
  resolveDispatchStatus,
  resolveSearchStartedAt,
} from "../src/api/v1/bookings/dispatchStatus.ts";
import type {
  BookingHistoryRecord,
  BookingRecord,
} from "../src/api/v1/bookings/repository.ts";

const baseBooking = {
  bookingNumber: "BK-TEST-0001",
  bookingType: "INSTANT",
  cancelledAt: null,
  cancelledById: null,
  cancelledByType: null,
  cancellationReason: null,
  checkedInAt: null,
  completedAt: null,
  confirmedAt: new Date("2026-06-30T17:00:00.000Z"),
  consumerId: "c1000001-0001-4001-8001-000000000001",
  consumerNotes: null,
  createdAt: new Date("2026-06-30T16:55:00.000Z"),
  enRouteAt: null,
  id: "26a9c51b-2cd4-4b88-b63f-0277d6488303",
  partnerAssignedAt: null,
  partnerId: null,
  paymentMode: "RAZORPAY",
  scheduledAt: null,
  scheduledEndAt: null,
  serviceId: "00000000-0000-0000-0000-000000000001",
  serviceName: "Quick Shine",
  startedAt: null,
  status: "CONFIRMED",
  subscriptionPlan: null,
  timeSlotId: null,
  totalAmount: "499.00",
  updatedAt: new Date("2026-06-30T17:00:00.000Z"),
  variantId: null,
  variantName: null,
  addressId: "00000000-0000-0000-0000-000000000100",
  consumerName: "Test User",
  consumerPhone: "+919999999999",
  addressSnapshot: null,
} as BookingRecord;

const historyEntry = (
  overrides: Partial<BookingHistoryRecord> & {
    metadata: Record<string, unknown>;
  },
): BookingHistoryRecord =>
  ({
    actorId: null,
    actorType: null,
    bookingId: baseBooking.id,
    createdAt: new Date("2026-06-30T17:01:00.000Z"),
    fromStatus: "CONFIRMED",
    id: "hist-1",
    reason: null,
    toStatus: "CONFIRMED",
    ...overrides,
  }) as BookingHistoryRecord;

describe("resolveDispatchMetadata", () => {
  it("returns metadata without escalation when no escalation entry exists", () => {
    const metadata = resolveDispatchMetadata([
      historyEntry({
        metadata: {
          firstDispatchAt: "2026-06-30T17:00:00.000Z",
          radiusMeters: 5000,
          type: "DISPATCH_ATTEMPT",
        },
      }),
    ]);

    expect(metadata.escalatedAt).toBeUndefined();
    expect(metadata.attemptCount).toBe(1);
    expect(metadata.radiusMeters).toBe(5000);
    expect(metadata.firstDispatchAt).toBe("2026-06-30T17:00:00.000Z");
  });

  it("falls back to attempt createdAt when firstDispatchAt is absent", () => {
    const metadata = resolveDispatchMetadata([
      historyEntry({
        createdAt: new Date("2026-06-30T17:02:00.000Z"),
        metadata: {
          radiusMeters: 5000,
          type: "DISPATCH_ATTEMPT",
        },
      }),
    ]);

    expect(metadata.firstDispatchAt).toBe("2026-06-30T17:02:00.000Z");
  });

  it("reads escalation from DISPATCH_ESCALATED history entries", () => {
    const metadata = resolveDispatchMetadata([
      historyEntry({
        metadata: {
          firstDispatchAt: "2026-06-30T17:00:00.000Z",
          radiusMeters: 7000,
          result: "NO_CANDIDATES",
          type: "DISPATCH_ATTEMPT",
        },
      }),
      historyEntry({
        createdAt: new Date("2026-06-30T17:05:00.000Z"),
        metadata: {
          escalatedAt: "2026-06-30T17:05:00.000Z",
          type: "DISPATCH_ESCALATED",
        },
      }),
    ]);

    expect(metadata.escalatedAt).toBe("2026-06-30T17:05:00.000Z");
    expect(metadata.radiusMeters).toBe(7000);
    expect(metadata.attemptCount).toBe(1);
  });
});

describe("resolveDispatchStatus", () => {
  it("returns SEARCHING for unassigned instant bookings", () => {
    const status = resolveDispatchStatus(baseBooking, []);

    expect(status.phase).toBe("SEARCHING");
    expect(status.searchStartedAt).toBe("2026-06-30T17:00:00.000Z");
    expect(status.searchEndsAt).toBe("2026-06-30T17:05:00.000Z");
    expect(status.escalatedAt).toBeNull();
  });

  it("returns ESCALATED after admin escalation", () => {
    const status = resolveDispatchStatus(baseBooking, [
      historyEntry({
        metadata: {
          escalatedAt: "2026-06-30T17:05:00.000Z",
          type: "DISPATCH_ESCALATED",
        },
      }),
    ]);

    expect(status.phase).toBe("ESCALATED");
    expect(status.escalatedAt).toBe("2026-06-30T17:05:00.000Z");
  });

  it("returns ASSIGNED when partner is set", () => {
    const status = resolveDispatchStatus(
      {
        ...baseBooking,
        partnerId: "a1000002-0002-4002-8002-000000000002",
        status: "PROFESSIONAL_ASSIGNED",
      },
      [],
    );

    expect(status.phase).toBe("ASSIGNED");
  });

  it("returns PENDING for far-future scheduled bookings", () => {
    const status = resolveDispatchStatus(
      {
        ...baseBooking,
        bookingType: "SCHEDULED",
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        scheduledEndAt: new Date(Date.now() + 49 * 60 * 60 * 1000),
      },
      [],
    );

    expect(status.phase).toBe("PENDING");
    expect(status.searchEndsAt).toBeNull();
  });

  it("returns FAILED when cancelled after dispatch failure", () => {
    const status = resolveDispatchStatus(
      {
        ...baseBooking,
        status: "CANCELLED",
        cancelledAt: new Date("2026-06-30T17:10:00.000Z"),
      },
      [
        historyEntry({
          metadata: {
            type: "DISPATCH_FAILED",
          },
        }),
      ],
    );

    expect(status.phase).toBe("FAILED");
    expect(status.message).toContain("No partner was available");
  });

  it("returns SEARCHING for scheduled bookings within 24 hours", () => {
    const status = resolveDispatchStatus(
      {
        ...baseBooking,
        bookingType: "SCHEDULED",
        scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        scheduledEndAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
      [],
    );

    expect(status.phase).toBe("SEARCHING");
    expect(status.searchEndsAt).toBeNull();
    expect(status.message).toContain("scheduled booking");
  });

  it("returns NOT_APPLICABLE for non-CONFIRMED status without partner", () => {
    const status = resolveDispatchStatus(
      {
        ...baseBooking,
        status: "COMPLETED",
        completedAt: new Date("2026-06-30T18:00:00.000Z"),
      },
      [],
    );

    expect(status.phase).toBe("NOT_APPLICABLE");
    expect(status.attemptCount).toBe(0);
    expect(status.radiusMeters).toBeNull();
  });

  it("returns NOT_APPLICABLE when scheduled booking lacks scheduledAt", () => {
    const status = resolveDispatchStatus(
      {
        ...baseBooking,
        bookingType: "SCHEDULED",
        scheduledAt: null,
        scheduledEndAt: null,
      },
      [],
    );

    expect(status.phase).toBe("NOT_APPLICABLE");
  });
});

describe("resolveSearchStartedAt", () => {
  it("prefers first dispatch attempt metadata", () => {
    const startedAt = resolveSearchStartedAt(baseBooking, [
      historyEntry({
        metadata: {
          firstDispatchAt: "2026-06-30T17:00:30.000Z",
          type: "DISPATCH_ATTEMPT",
        },
      }),
    ]);

    expect(startedAt).toBe("2026-06-30T17:00:30.000Z");
  });

  it("falls back to current time when confirmedAt is missing and no attempts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00.000Z"));

    const startedAt = resolveSearchStartedAt(
      { confirmedAt: null },
      [],
    );

    expect(startedAt).toBe("2026-07-12T12:00:00.000Z");
    vi.useRealTimers();
  });
});
