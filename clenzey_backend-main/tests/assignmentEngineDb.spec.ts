import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock("../src/db/index.ts", () => ({
  default: { execute: mockExecute },
}));

import { findScoredCandidates } from "../src/api/v1/bookings/assignmentEngine.ts";
import { DEFAULT_RATING } from "../src/configs/dispatchConfig.ts";

const baseInput = {
  latitude: 12.9716,
  longitude: 77.5946,
  maxRadiusMeters: 5000,
  mode: "INSTANT" as const,
  serviceId: "service-1",
  zoneId: "zone-1",
};

describe("findScoredCandidates", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("returns mapped scored partner candidates from db rows", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          partner_id: "partner-1",
          distance: 2500.7,
          lat: 12.9716,
          lng: 77.5946,
          avg_rating: "4.5",
          score: 0.42,
          workload: 2,
        },
      ],
    });

    const result = await findScoredCandidates(baseInput);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        partnerId: "partner-1",
        distanceMeters: 2501,
        latitude: 12.9716,
        longitude: 77.5946,
        avgRating: 4.5,
        score: 0.42,
        workload: 2,
      },
    ]);
  });

  it("uses DEFAULT_RATING when avg_rating is null", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          partner_id: "partner-2",
          distance: 1000,
          lat: 12.9,
          lng: 77.5,
          avg_rating: null,
          score: 0.1,
          workload: 0,
        },
      ],
    });

    const result = await findScoredCandidates(baseInput);

    expect(result[0]?.avgRating).toBe(DEFAULT_RATING);
  });

  it("returns an empty array when db has no candidates", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await findScoredCandidates({
      ...baseInput,
      limit: 10,
    });

    expect(result).toEqual([]);
  });

  it("queries with SCHEDULED_BATCH mode and scheduled times", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findScoredCandidates({
      ...baseInput,
      mode: "SCHEDULED_BATCH",
      scheduledAt: new Date("2026-07-15T10:00:00+05:30"),
      scheduledEndAt: new Date("2026-07-15T12:00:00+05:30"),
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("queries with SCHEDULED_REVALIDATE mode", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findScoredCandidates({
      ...baseInput,
      mode: "SCHEDULED_REVALIDATE",
      scheduledAt: new Date("2026-07-15T10:00:00+05:30"),
      scheduledEndAt: new Date("2026-07-15T11:00:00+05:30"),
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("passes excludePartnerIds when non-empty", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findScoredCandidates({
      ...baseInput,
      excludePartnerIds: ["partner-x", "partner-y"],
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("uses default 60min duration when scheduledEndAt is missing", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findScoredCandidates({
      ...baseInput,
      mode: "SCHEDULED_BATCH",
      scheduledAt: new Date("2026-07-15T10:00:00+05:30"),
      scheduledEndAt: null,
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("rounds end hour up when slot ends mid-hour", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await findScoredCandidates({
      ...baseInput,
      mode: "SCHEDULED_BATCH",
      scheduledAt: new Date("2026-07-15T10:00:00+05:30"),
      scheduledEndAt: new Date("2026-07-15T10:45:00+05:30"),
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
