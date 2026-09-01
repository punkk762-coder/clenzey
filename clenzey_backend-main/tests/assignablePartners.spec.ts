import { afterEach, describe, expect, it, vi } from "vitest";

import type { BookingRecord } from "../src/api/v1/bookings/repository.ts";
import * as repo from "../src/api/v1/bookings/repository.ts";
import {
  isPartnerAssignableToBooking,
  listAssignablePartnersForBooking,
} from "../src/api/v1/bookings/service.ts";
import * as partnersRepo from "../src/api/v1/partners/repository.ts";
import * as skillsRepo from "../src/api/v1/skills/repository.ts";

const makeBooking = (overrides: Partial<BookingRecord> = {}): BookingRecord =>
  ({
    id: "booking-1",
    scheduledAt: new Date("2026-07-12T13:00:00.000Z"),
    scheduledEndAt: new Date("2026-07-12T14:30:00.000Z"),
    serviceId: "service-1",
    status: "CONFIRMED",
    ...overrides,
  }) as BookingRecord;

describe("assignable partners for booking", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("excludes partners with overlapping active bookings", async () => {
    vi.spyOn(repo, "findBookingById").mockResolvedValue(makeBooking());
    vi.spyOn(skillsRepo, "listPartnersBySkill").mockResolvedValue({
      partners: [
        {
          avgRating: "4.8",
          fullName: "Available Partner",
          id: "partner-available",
          phone: "+919999999991",
          profileImage: null,
          totalReviews: 10,
        },
        {
          avgRating: "4.5",
          fullName: "Busy Partner",
          id: "partner-busy",
          phone: "+919999999992",
          profileImage: null,
          totalReviews: 8,
        },
      ],
      total: 2,
    });

    vi.spyOn(partnersRepo, "findPartnerById").mockImplementation(async (id) =>
      ({
        partner: { approvalStatus: "APPROVED" },
      }) as never,
    );
    vi.spyOn(skillsRepo, "getPartnerSkills").mockResolvedValue([
      { serviceId: "service-1" } as never,
    ]);
    vi.spyOn(repo, "hasOverlappingActiveBooking").mockImplementation(
      async (partnerId) => partnerId === "partner-busy",
    );

    const partners = await listAssignablePartnersForBooking("booking-1");

    expect(partners).toHaveLength(1);
    expect(partners[0]?.id).toBe("partner-available");
  });

  it("returns false when partner has an overlapping booking", async () => {
    vi.spyOn(partnersRepo, "findPartnerById").mockResolvedValue({
      partner: { approvalStatus: "APPROVED" },
    } as never);
    vi.spyOn(skillsRepo, "getPartnerSkills").mockResolvedValue([
      { serviceId: "service-1" } as never,
    ]);
    vi.spyOn(repo, "hasOverlappingActiveBooking").mockResolvedValue(true);

    await expect(
      isPartnerAssignableToBooking(makeBooking(), "partner-busy"),
    ).resolves.toBe(false);
  });
});
