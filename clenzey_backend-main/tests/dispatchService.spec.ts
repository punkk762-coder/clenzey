import { describe, expect, it } from "vitest";

import {
  canTransition,
  validTransitionsFrom,
} from "../src/api/v1/bookings/stateMachine.ts";
import { dispatchJobId } from "../src/queues/dispatchQueue.ts";

describe("dispatch state machine", () => {
  it("allows SYSTEM to assign partner from CONFIRMED", () => {
    expect(canTransition("CONFIRMED", "PROFESSIONAL_ASSIGNED", "SYSTEM")).toBe(
      true,
    );
  });

  it("allows SYSTEM to revert to CONFIRMED for revalidation reassignment", () => {
    expect(canTransition("PROFESSIONAL_ASSIGNED", "CONFIRMED", "SYSTEM")).toBe(
      true,
    );
  });

  it("includes PROFESSIONAL_ASSIGNED in CONFIRMED transitions", () => {
    expect(validTransitionsFrom("CONFIRMED")).toContain("PROFESSIONAL_ASSIGNED");
  });
});

describe("dispatch queue job ids", () => {
  it("builds stable instant dispatch job id without colons", () => {
    const bookingId = "550e8400-e29b-41d4-a716-446655440000";
    const jobId = dispatchJobId("instant", bookingId);
    expect(jobId).toBe("instant_550e8400-e29b-41d4-a716-446655440000");
    expect(jobId).not.toContain(":");
  });
});
