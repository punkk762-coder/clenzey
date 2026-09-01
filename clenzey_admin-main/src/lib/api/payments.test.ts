import { describe, expect, it } from "vitest";

import {
  mapPayout,
  mapPayoutStatus,
  mapRefund,
  toBackendPayoutStatus,
} from "./payments";

describe("payments mappers", () => {
  it("maps backend payout records and coerces string amounts", () => {
    expect(
      mapPayout({
        id: "payout-1",
        partnerId: "partner-1",
        amount: "1250.50",
        status: "PENDING",
        notes: "Weekly payout",
        createdAt: "2026-06-22T08:30:03.701Z",
      }),
    ).toEqual({
      id: "payout-1",
      partnerId: "partner-1",
      partnerName: "",
      amount: 1250.5,
      status: "PENDING",
      notes: "Weekly payout",
      periodStart: undefined,
      periodEnd: undefined,
      createdAt: "2026-06-22T08:30:03.701Z",
    });
  });

  it("maps backend refund records", () => {
    expect(
      mapRefund({
        id: "refund-1",
        bookingId: "booking-1",
        amount: "499.00",
        reason: "Service issue",
        status: "INITIATED",
        createdAt: "2026-06-22T08:30:03.701Z",
      }),
    ).toEqual({
      id: "refund-1",
      bookingId: "booking-1",
      refundAmount: 499,
      amount: 499,
      reason: "Service issue",
      status: "INITIATED",
      createdAt: "2026-06-22T08:30:03.701Z",
    });
  });

  it("maps payout status between backend and UI enums", () => {
    expect(mapPayoutStatus("PAID")).toBe("COMPLETED");
    expect(mapPayoutStatus("FAILED")).toBe("ON_HOLD");
    expect(toBackendPayoutStatus("COMPLETED")).toBe("PAID");
    expect(toBackendPayoutStatus("ON_HOLD")).toBe("FAILED");
  });
});
