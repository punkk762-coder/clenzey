import { describe, expect, it } from "vitest";

import {
  assertBookingAccess,
  type BookingAccessContext,
} from "../src/utilities/bookingAccessControl.ts";
import { UnauthorizedError } from "../src/errors/appErrors.ts";

describe("assertBookingAccess", () => {
  const booking = {
    consumerId: "consumer-1",
    partnerId: "partner-1",
  };

  it("allows admin access to any booking", () => {
    const ctx: BookingAccessContext = {
      actorType: "ADMIN",
      userId: "admin-1",
    };
    expect(() => assertBookingAccess(booking, ctx)).not.toThrow();
  });

  it("allows consumer access to own booking", () => {
    const ctx: BookingAccessContext = {
      actorType: "CONSUMER",
      userId: "consumer-1",
    };
    expect(() => assertBookingAccess(booking, ctx)).not.toThrow();
  });

  it("allows assigned partner access", () => {
    const ctx: BookingAccessContext = {
      actorType: "PARTNER",
      userId: "partner-1",
    };
    expect(() => assertBookingAccess(booking, ctx)).not.toThrow();
  });

  it("denies consumer access to another consumer booking", () => {
    const ctx: BookingAccessContext = {
      actorType: "CONSUMER",
      userId: "consumer-2",
    };
    expect(() => assertBookingAccess(booking, ctx)).toThrow(UnauthorizedError);
  });

  it("denies unassigned partner access", () => {
    const ctx: BookingAccessContext = {
      actorType: "PARTNER",
      userId: "partner-2",
    };
    expect(() => assertBookingAccess(booking, ctx)).toThrow(UnauthorizedError);
  });
});
