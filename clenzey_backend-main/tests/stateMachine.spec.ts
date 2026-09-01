import { describe, expect, it } from "vitest";

import {
  canTransition,
  isCancellableByConsumer,
  isTerminal,
  validTransitionsFrom,
  validTransitionsFromForActor,
} from "../src/api/v1/bookings/stateMachine.ts";

describe("booking state machine", () => {
  it("identifies terminal states", () => {
    expect(isTerminal("REFUNDED")).toBe(true);
    expect(isTerminal("COMPLETED")).toBe(false);
  });

  it("allows SYSTEM to move PENDING to PAYMENT_PENDING", () => {
    expect(canTransition("PENDING", "PAYMENT_PENDING", "SYSTEM")).toBe(true);
  });

  it("allows CONSUMER to cancel from CONFIRMED", () => {
    expect(canTransition("CONFIRMED", "CANCELLED", "CONSUMER")).toBe(true);
  });

  it("denies CONSUMER from transitioning to IN_PROGRESS", () => {
    expect(canTransition("CHECKED_IN", "IN_PROGRESS", "CONSUMER")).toBe(false);
  });

  it("lists valid transitions from CONFIRMED", () => {
    const transitions = validTransitionsFrom("CONFIRMED");
    expect(transitions).toContain("PROFESSIONAL_ASSIGNED");
    expect(transitions).toContain("CANCELLED");
  });

  it("filters transitions by actor", () => {
    const partnerTransitions = validTransitionsFromForActor(
      "PROFESSIONAL_ASSIGNED",
      "PARTNER",
    );
    expect(partnerTransitions).toContain("PROFESSIONAL_EN_ROUTE");
    expect(partnerTransitions).not.toContain("REFUNDED");
  });

  it("reports consumer-cancellable statuses", () => {
    expect(isCancellableByConsumer("CONFIRMED")).toBe(true);
    expect(isCancellableByConsumer("IN_PROGRESS")).toBe(false);
  });
});
