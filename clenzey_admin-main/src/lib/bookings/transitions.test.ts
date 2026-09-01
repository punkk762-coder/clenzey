import { describe, expect, it } from "vitest";

import {
  ADMIN_TRANSITIONS_BY_STATUS,
  canAdminAssignPartner,
  getAdminNextStatuses,
} from "./transitions";

describe("admin booking transitions", () => {
  it("does not offer payment or confirmation from PENDING", () => {
    expect(getAdminNextStatuses("PENDING")).toEqual(["CANCELLED"]);
    expect(getAdminNextStatuses("PENDING")).not.toContain("PAYMENT_PENDING");
    expect(getAdminNextStatuses("PENDING")).not.toContain("CONFIRMED");
  });

  it("does not offer confirmation from PAYMENT_PENDING", () => {
    expect(getAdminNextStatuses("PAYMENT_PENDING")).toEqual(["CANCELLED"]);
  });

  it("exposes refund from terminal-ish states", () => {
    expect(getAdminNextStatuses("CANCELLED")).toContain("REFUNDED");
    expect(getAdminNextStatuses("COMPLETED")).toContain("REFUNDED");
    expect(getAdminNextStatuses("NO_SHOW")).toContain("REFUNDED");
  });

  it("allows partner revert and no-show where backend permits", () => {
    expect(getAdminNextStatuses("PROFESSIONAL_ASSIGNED")).toEqual(
      expect.arrayContaining(["NO_SHOW", "CONFIRMED"]),
    );
  });

  it("only allows assign on confirmed bookings without a partner", () => {
    expect(canAdminAssignPartner("CONFIRMED", null)).toBe(true);
    expect(canAdminAssignPartner("CONFIRMED", "partner-1")).toBe(false);
    expect(canAdminAssignPartner("PROFESSIONAL_ASSIGNED", null)).toBe(false);
  });

  it("covers every non-terminal status used in the admin UI", () => {
    const covered = Object.keys(ADMIN_TRANSITIONS_BY_STATUS);
    expect(covered).toEqual(
      expect.arrayContaining([
        "PENDING",
        "PAYMENT_PENDING",
        "CONFIRMED",
        "PROFESSIONAL_ASSIGNED",
        "IN_PROGRESS",
      ]),
    );
  });
});
