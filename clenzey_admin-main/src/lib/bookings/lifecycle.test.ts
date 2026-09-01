import { describe, expect, it } from "vitest";

import { buildLifecycleSteps } from "./lifecycle";
import type { BookingDetail } from "@/types";

function makeBooking(
  overrides: Partial<BookingDetail> = {},
): BookingDetail {
  return {
    id: "b1",
    bookingNumber: "BK-001",
    bookingType: "INSTANT",
    status: "PAYMENT_PENDING",
    paymentStatus: "PENDING",
    consumerId: "c1",
    consumerName: "Test User",
    consumerPhone: "+910000000000",
    partnerId: null,
    serviceId: "s1",
    serviceName: "Cleaning",
    variantLabel: "30 mins",
    addressId: "a1",
    addressSnapshot: "123 Street",
    basePrice: "100",
    totalAmount: "120",
    subtotal: "100",
    surgeAmount: "0",
    surgeMultiplier: "1",
    discountAmount: "0",
    taxAmount: "10",
    platformFee: "10",
    scheduledAt: null,
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:05:00.000Z",
    cancelledAt: null,
    cancellationReason: null,
    addons: [],
    history: [
      {
        id: "h1",
        fromStatus: null,
        toStatus: "PENDING",
        createdAt: "2026-06-20T10:00:00.000Z",
      },
      {
        id: "h2",
        fromStatus: "PENDING",
        toStatus: "PAYMENT_PENDING",
        createdAt: "2026-06-20T10:05:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("buildLifecycleSteps", () => {
  it("uses history timestamps for lifecycle steps", () => {
    const steps = buildLifecycleSteps(makeBooking());

    expect(steps.find((s) => s.status === "PENDING")?.at).toBe(
      "2026-06-20T10:00:00.000Z",
    );
    expect(steps.find((s) => s.status === "PAYMENT_PENDING")?.at).toBe(
      "2026-06-20T10:05:00.000Z",
    );
    expect(steps.find((s) => s.status === "PAYMENT_PENDING")?.isCurrent).toBe(
      true,
    );
    expect(steps.find((s) => s.status === "CONFIRMED")?.at).toBeNull();
  });

  it("appends terminal statuses", () => {
    const steps = buildLifecycleSteps(
      makeBooking({
        status: "CANCELLED",
        cancelledAt: "2026-06-20T11:00:00.000Z",
        history: [
          {
            id: "h3",
            fromStatus: "PAYMENT_PENDING",
            toStatus: "CANCELLED",
            createdAt: "2026-06-20T11:00:00.000Z",
          },
        ],
      }),
    );

    expect(steps.at(-1)?.status).toBe("CANCELLED");
    expect(steps.at(-1)?.at).toBe("2026-06-20T11:00:00.000Z");
  });
});
