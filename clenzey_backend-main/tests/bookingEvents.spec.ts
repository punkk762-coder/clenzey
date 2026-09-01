import { describe, expect, it, vi } from "vitest";

import { bookingEvents } from "../src/realtime/bookingEvents.ts";

describe("bookingEvents bus", () => {
  it("emits booking created events", () => {
    const handler = vi.fn();
    bookingEvents.on("booking:created", handler);
    const payload = {
      bookingId: "b1",
      consumerId: "c1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    bookingEvents.emitBookingCreated(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("booking:created", handler);
  });

  it("emits named status events from status changes", () => {
    const confirmedHandler = vi.fn();
    const statusHandler = vi.fn();
    bookingEvents.on("booking:confirmed", confirmedHandler);
    bookingEvents.on("booking:status_changed", statusHandler);

    const payload = {
      bookingId: "b1",
      consumerId: "c1",
      fromStatus: "PENDING" as const,
      partnerId: null,
      timestamp: "2026-01-01T00:00:00.000Z",
      toStatus: "CONFIRMED" as const,
    };
    bookingEvents.emitStatusChanged(payload);

    expect(statusHandler).toHaveBeenCalledWith(payload);
    expect(confirmedHandler).toHaveBeenCalledWith(payload);
    bookingEvents.off("booking:confirmed", confirmedHandler);
    bookingEvents.off("booking:status_changed", statusHandler);
  });

  it("emits additional named status events for lifecycle transitions", () => {
    const handlers = {
      cancelled: vi.fn(),
      checkedIn: vi.fn(),
      completed: vi.fn(),
      enRoute: vi.fn(),
      partnerAssigned: vi.fn(),
      paymentPending: vi.fn(),
      refunded: vi.fn(),
      started: vi.fn(),
    };

    bookingEvents.on("booking:cancelled", handlers.cancelled);
    bookingEvents.on("booking:checked_in", handlers.checkedIn);
    bookingEvents.on("booking:completed", handlers.completed);
    bookingEvents.on("booking:en_route", handlers.enRoute);
    bookingEvents.on("booking:partner_assigned", handlers.partnerAssigned);
    bookingEvents.on("booking:payment_pending", handlers.paymentPending);
    bookingEvents.on("booking:refunded", handlers.refunded);
    bookingEvents.on("booking:started", handlers.started);

    const base = {
      bookingId: "b1",
      consumerId: "c1",
      fromStatus: null,
      partnerId: "p1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };

    const transitions = [
      ["CANCELLED", handlers.cancelled],
      ["CHECKED_IN", handlers.checkedIn],
      ["COMPLETED", handlers.completed],
      ["PROFESSIONAL_EN_ROUTE", handlers.enRoute],
      ["PROFESSIONAL_ASSIGNED", handlers.partnerAssigned],
      ["PAYMENT_PENDING", handlers.paymentPending],
      ["REFUNDED", handlers.refunded],
      ["IN_PROGRESS", handlers.started],
    ] as const;

    for (const [toStatus, handler] of transitions) {
      bookingEvents.emitStatusChanged({ ...base, toStatus });
      expect(handler).toHaveBeenCalledWith({ ...base, toStatus });
    }

    bookingEvents.off("booking:cancelled", handlers.cancelled);
    bookingEvents.off("booking:checked_in", handlers.checkedIn);
    bookingEvents.off("booking:completed", handlers.completed);
    bookingEvents.off("booking:en_route", handlers.enRoute);
    bookingEvents.off("booking:partner_assigned", handlers.partnerAssigned);
    bookingEvents.off("booking:payment_pending", handlers.paymentPending);
    bookingEvents.off("booking:refunded", handlers.refunded);
    bookingEvents.off("booking:started", handlers.started);
  });

  it("emits status_changed without named event for NO_SHOW", () => {
    const statusHandler = vi.fn();
    const noShowHandler = vi.fn();
    bookingEvents.on("booking:status_changed", statusHandler);
    bookingEvents.on("booking:no_show" as never, noShowHandler);

    const payload = {
      bookingId: "b1",
      consumerId: "c1",
      fromStatus: "CONFIRMED" as const,
      partnerId: "p1",
      timestamp: "2026-01-01T00:00:00.000Z",
      toStatus: "NO_SHOW" as const,
    };
    bookingEvents.emitStatusChanged(payload);

    expect(statusHandler).toHaveBeenCalledWith(payload);
    expect(noShowHandler).not.toHaveBeenCalled();

    bookingEvents.off("booking:status_changed", statusHandler);
    bookingEvents.off("booking:no_show" as never, noShowHandler);
  });

  it("emits partner location events", () => {
    const handler = vi.fn();
    bookingEvents.on("partner:location", handler);
    const payload = {
      isOnline: true,
      latitude: 12.97,
      longitude: 77.59,
      partnerId: "p1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    bookingEvents.emitPartnerLocation(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("partner:location", handler);
  });

  it("emits partner location stream events", () => {
    const handler = vi.fn();
    bookingEvents.on("partner:location_stream", handler);
    const payload = {
      bookingId: "b1",
      heading: 90,
      latitude: 12.97,
      longitude: 77.59,
      speed: 10,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    bookingEvents.emitPartnerLocationStream(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("partner:location_stream", handler);
  });

  it("emits stale partner location events", () => {
    const handler = vi.fn();
    bookingEvents.on("partner:location_stale", handler);
    const payload = {
      bookingId: "b1",
      consumerId: "c1",
      lastReceivedAt: "2026-01-01T00:00:00.000Z",
      timestamp: "2026-01-01T00:05:00.000Z",
    };
    bookingEvents.emitPartnerLocationStale(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("partner:location_stale", handler);
  });

  it("emits partner proposed events", () => {
    const handler = vi.fn();
    bookingEvents.on("booking:partner_proposed", handler);
    const payload = {
      bookingId: "b1",
      candidates: ["p1", "p2"],
      consumerId: "c1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    bookingEvents.emitPartnerProposed(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("booking:partner_proposed", handler);
  });

  it("emits dispatch searching events", () => {
    const handler = vi.fn();
    bookingEvents.on("booking:dispatch_searching", handler);
    const payload = {
      bookingId: "b1",
      bookingType: "INSTANT" as const,
      consumerId: "c1",
      searchEndsAt: "2026-01-01T00:10:00.000Z",
      searchStartedAt: "2026-01-01T00:00:00.000Z",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    bookingEvents.emitDispatchSearching(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("booking:dispatch_searching", handler);
  });

  it("emits dispatch escalated events", () => {
    const handler = vi.fn();
    bookingEvents.on("booking:dispatch_escalated", handler);
    const payload = {
      bookingId: "b1",
      consumerId: "c1",
      escalatedAt: "2026-01-01T00:10:00.000Z",
      message: "No partners found",
      searchEndsAt: "2026-01-01T00:15:00.000Z",
      timestamp: "2026-01-01T00:10:00.000Z",
    };
    bookingEvents.emitDispatchEscalated(payload);
    expect(handler).toHaveBeenCalledWith(payload);
    bookingEvents.off("booking:dispatch_escalated", handler);
  });
});
