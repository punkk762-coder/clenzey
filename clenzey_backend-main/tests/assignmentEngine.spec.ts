import { describe, expect, it } from "vitest";

import { expandRadius } from "../src/api/v1/bookings/assignmentEngine.ts";
import { dispatchConfig, SCORE_WEIGHTS } from "../src/configs/dispatchConfig.ts";

describe("assignmentEngine scoring weights", () => {
  it("uses distance, rating, and workload weights that sum to 1", () => {
    const total =
      SCORE_WEIGHTS.distance +
      SCORE_WEIGHTS.rating +
      SCORE_WEIGHTS.workload;
    expect(total).toBeCloseTo(1);
  });
});

describe("expandRadius", () => {
  it("increments radius by configured step up to max", () => {
    const next = expandRadius(dispatchConfig.initialRadiusM);
    expect(next).toBe(
      dispatchConfig.initialRadiusM + dispatchConfig.radiusIncrementM,
    );
  });

  it("does not exceed max radius", () => {
    const next = expandRadius(dispatchConfig.maxRadiusM);
    expect(next).toBe(dispatchConfig.maxRadiusM);
  });
});

describe("dispatchConfig defaults", () => {
  it("has sensible instant dispatch defaults", () => {
    expect(dispatchConfig.initialRadiusM).toBe(5000);
    expect(dispatchConfig.maxRadiusM).toBe(15000);
    expect(dispatchConfig.escalationMin).toBe(5);
    expect(dispatchConfig.redispatchIntervalSec).toBe(30);
    expect(dispatchConfig.revalidateLeadMin).toBe(30);
  });
});

describe("partner zone scoring formula", () => {
  it("prefers closer partners with lower score", () => {
    const maxRadius = 5000;
    const closerScore =
      (1000 / maxRadius) * SCORE_WEIGHTS.distance +
      (1 - 4.5 / 5) * SCORE_WEIGHTS.rating +
      (1 / 8) * SCORE_WEIGHTS.workload;
    const fartherScore =
      (4000 / maxRadius) * SCORE_WEIGHTS.distance +
      (1 - 4.5 / 5) * SCORE_WEIGHTS.rating +
      (1 / 8) * SCORE_WEIGHTS.workload;
    expect(closerScore).toBeLessThan(fartherScore);
  });

  it("prefers higher-rated partners at similar distance", () => {
    const maxRadius = 5000;
    const distance = 2000;
    const highRated =
      (distance / maxRadius) * SCORE_WEIGHTS.distance +
      (1 - 4.8 / 5) * SCORE_WEIGHTS.rating +
      (2 / 8) * SCORE_WEIGHTS.workload;
    const lowRated =
      (distance / maxRadius) * SCORE_WEIGHTS.distance +
      (1 - 3.0 / 5) * SCORE_WEIGHTS.rating +
      (2 / 8) * SCORE_WEIGHTS.workload;
    expect(highRated).toBeLessThan(lowRated);
  });
});
