import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock("../src/db/index.ts", () => ({
  default: { execute: mockExecute },
}));

import {
  findNearestEligiblePartnersForScheduled,
  findNearestPartners,
} from "../src/api/v1/bookings/partnerMatcher.ts";

describe("findNearestPartners", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("maps db rows to NearestPartner shape", async () => {
    const lastSeenAt = new Date("2026-07-12T10:00:00.000Z");
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          partner_id: "partner-1",
          last_seen_at: lastSeenAt,
          distance: 1234.56,
        },
      ],
    });

    const result = await findNearestPartners({
      latitude: 12.9716,
      longitude: 77.5946,
      maxDistanceMeters: 5000,
      limit: 3,
    });

    expect(result).toEqual([
      {
        partnerId: "partner-1",
        lastSeenAt,
        distanceMeters: 1235,
      },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("expands search radius when no partners are found initially", async () => {
    const lastSeenAt = new Date("2026-07-12T10:00:00.000Z");
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            partner_id: "partner-2",
            last_seen_at: lastSeenAt,
            distance: 6500,
          },
        ],
      });

    const result = await findNearestPartners({
      latitude: 12.9716,
      longitude: 77.5946,
      maxDistanceMeters: 5000,
    });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      {
        partnerId: "partner-2",
        lastSeenAt,
        distanceMeters: 6500,
      },
    ]);
  });

  it("returns empty array after exhausting radius expansion", async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const result = await findNearestPartners({
      latitude: 12.9716,
      longitude: 77.5946,
      maxDistanceMeters: 5000,
    });

    expect(result).toEqual([]);
    expect(mockExecute).toHaveBeenCalledTimes(6);
  });

  it("finds partners without serviceId filter", async () => {
    const lastSeenAt = new Date("2026-07-12T10:00:00.000Z");
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          partner_id: "partner-no-skill-filter",
          last_seen_at: lastSeenAt,
          distance: 800,
        },
      ],
    });

    const result = await findNearestPartners({
      latitude: 12.9716,
      longitude: 77.5946,
      maxDistanceMeters: 5000,
    });

    expect(result).toEqual([
      {
        partnerId: "partner-no-skill-filter",
        lastSeenAt,
        distanceMeters: 800,
      },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("finds partners when serviceId filter is provided", async () => {
    const lastSeenAt = new Date("2026-07-12T10:00:00.000Z");
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          partner_id: "skilled-partner",
          last_seen_at: lastSeenAt,
          distance: 900,
        },
      ],
    });

    const result = await findNearestPartners({
      latitude: 12.9716,
      longitude: 77.5946,
      maxDistanceMeters: 5000,
      serviceId: "service-1",
    });

    expect(result[0]?.partnerId).toBe("skilled-partner");
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

describe("findNearestEligiblePartnersForScheduled", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("maps scheduled-eligible partners from db rows", async () => {
    const lastSeenAt = new Date("2026-07-11T08:30:00.000Z");
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          partner_id: "scheduled-partner",
          last_seen_at: lastSeenAt,
          distance: 4200.2,
        },
      ],
    });

    const result = await findNearestEligiblePartnersForScheduled({
      latitude: 12.9716,
      longitude: 77.5946,
      serviceId: "service-1",
      maxDistanceMeters: 5000,
      limit: 5,
    });

    expect(result).toEqual([
      {
        partnerId: "scheduled-partner",
        lastSeenAt,
        distanceMeters: 4200,
      },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("expands radius for scheduled eligibility searches", async () => {
    const lastSeenAt = new Date("2026-07-11T08:30:00.000Z");
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            partner_id: "scheduled-partner-2",
            last_seen_at: lastSeenAt,
            distance: 7100,
          },
        ],
      });

    const result = await findNearestEligiblePartnersForScheduled({
      latitude: 12.9716,
      longitude: 77.5946,
      serviceId: "service-1",
      maxDistanceMeters: 5000,
    });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(result[0]?.partnerId).toBe("scheduled-partner-2");
  });
});
