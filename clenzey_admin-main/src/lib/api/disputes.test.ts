import { describe, expect, it } from "vitest";

import { mapDispute, toAdminUpdateStatus } from "./disputes";

describe("mapDispute", () => {
  it("maps enriched backend records to the admin UI shape", () => {
    const dispute = mapDispute({
      id: "dispute-1",
      bookingId: "booking-1",
      bookingNumber: "BK-SEED-0001",
      category: "SERVICE_QUALITY",
      status: "OPEN",
      description: "Missed rooms",
      resolutionNotes: null,
      consumerName: "Priya Sharma",
      partnerName: "Suresh Yadav",
      createdAt: "2026-06-22T08:30:03.701Z",
      updatedAt: "2026-06-22T08:30:03.701Z",
    });

    expect(dispute.bookingReference).toBe("BK-SEED-0001");
    expect(dispute.consumerName).toBe("Priya Sharma");
    expect(dispute.partnerName).toBe("Suresh Yadav");
  });

  it("falls back when booking context is missing", () => {
    const dispute = mapDispute({
      id: "dispute-1",
      bookingId: "booking-1",
      category: "PRICING",
      status: "UNDER_REVIEW",
      description: "Overcharged",
      createdAt: new Date("2026-06-22T08:30:03.701Z"),
      updatedAt: new Date("2026-06-22T08:30:03.701Z"),
    });

    expect(dispute.bookingReference).toBe("BOOKING-");
    expect(dispute.consumerName).toBe("Unknown customer");
    expect(dispute.partnerName).toBe("Unassigned");
  });
});

describe("toAdminUpdateStatus", () => {
  it("maps OPEN to UNDER_REVIEW for admin PATCH requests", () => {
    expect(toAdminUpdateStatus("OPEN")).toBe("UNDER_REVIEW");
    expect(toAdminUpdateStatus("RESOLVED")).toBe("RESOLVED");
  });
});
