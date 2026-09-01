import { describe, expect, it, vi } from "vitest";

import { domainEvents } from "../src/realtime/domainEvents.ts";

describe("domainEvents bus", () => {
  it("emits service lifecycle events", () => {
    const created = vi.fn();
    const updated = vi.fn();
    const deleted = vi.fn();
    domainEvents.on("service:created", created);
    domainEvents.on("service:updated", updated);
    domainEvents.on("service:deleted", deleted);

    const servicePayload = {
      service: { id: "svc-1" },
      timestamp: new Date().toISOString(),
    };
    domainEvents.emitServiceCreated(servicePayload);
    domainEvents.emitServiceUpdated(servicePayload);
    domainEvents.emitServiceDeleted({
      serviceId: "svc-1",
      timestamp: servicePayload.timestamp,
    });

    expect(created).toHaveBeenCalledWith(servicePayload);
    expect(updated).toHaveBeenCalledWith(servicePayload);
    expect(deleted).toHaveBeenCalledOnce();

    domainEvents.off("service:created", created);
    domainEvents.off("service:updated", updated);
    domainEvents.off("service:deleted", deleted);
  });

  it("emits quotation events", () => {
    const created = vi.fn();
    const updated = vi.fn();
    domainEvents.on("quotation:created", created);
    domainEvents.on("quotation:updated", updated);

    const payload = {
      consumerId: "c1",
      quotation: { id: "q1" },
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    domainEvents.emitQuotationCreated(payload);
    domainEvents.emitQuotationUpdated(payload);

    expect(created).toHaveBeenCalledWith(payload);
    expect(updated).toHaveBeenCalledWith(payload);
    domainEvents.off("quotation:created", created);
    domainEvents.off("quotation:updated", updated);
  });

  it("emits zone lifecycle events", () => {
    const created = vi.fn();
    const updated = vi.fn();
    const deleted = vi.fn();
    domainEvents.on("zone:created", created);
    domainEvents.on("zone:updated", updated);
    domainEvents.on("zone:deleted", deleted);

    const zonePayload = {
      timestamp: "2026-01-01T00:00:00.000Z",
      zone: { id: "z1" },
    };
    domainEvents.emitZoneCreated(zonePayload);
    domainEvents.emitZoneUpdated(zonePayload);
    domainEvents.emitZoneDeleted({ timestamp: zonePayload.timestamp, zoneId: "z1" });

    expect(created).toHaveBeenCalledWith(zonePayload);
    expect(updated).toHaveBeenCalledWith(zonePayload);
    expect(deleted).toHaveBeenCalledOnce();
    domainEvents.off("zone:created", created);
    domainEvents.off("zone:updated", updated);
    domainEvents.off("zone:deleted", deleted);
  });

  it("emits address lifecycle events", () => {
    const created = vi.fn();
    const updated = vi.fn();
    const deleted = vi.fn();
    domainEvents.on("address:created", created);
    domainEvents.on("address:updated", updated);
    domainEvents.on("address:deleted", deleted);

    const addressPayload = {
      address: { id: "a1" },
      consumerId: "c1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    domainEvents.emitAddressCreated(addressPayload);
    domainEvents.emitAddressUpdated(addressPayload);
    domainEvents.emitAddressDeleted({
      addressId: "a1",
      consumerId: "c1",
      timestamp: addressPayload.timestamp,
    });

    expect(created).toHaveBeenCalledWith(addressPayload);
    expect(updated).toHaveBeenCalledWith(addressPayload);
    expect(deleted).toHaveBeenCalledOnce();
    domainEvents.off("address:created", created);
    domainEvents.off("address:updated", updated);
    domainEvents.off("address:deleted", deleted);
  });

  it("emits review and eta events", () => {
    const reviewHandler = vi.fn();
    const etaHandler = vi.fn();
    domainEvents.on("review:created", reviewHandler);
    domainEvents.on("eta:updated", etaHandler);

    domainEvents.emitReviewCreated({
      consumerId: "c1",
      partnerId: "p1",
      rating: 5,
      reviewId: "r1",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    domainEvents.emitEtaUpdated({
      bookingId: "b1",
      etaMinutes: 12,
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    expect(reviewHandler).toHaveBeenCalledOnce();
    expect(etaHandler).toHaveBeenCalledOnce();
    domainEvents.off("review:created", reviewHandler);
    domainEvents.off("eta:updated", etaHandler);
  });

  it("emits dispute and incentive events", () => {
    const disputeHandler = vi.fn();
    const incentiveHandler = vi.fn();
    domainEvents.on("dispute:created", disputeHandler);
    domainEvents.on("incentive:credited", incentiveHandler);

    domainEvents.emitDisputeCreated({
      bookingId: "b1",
      disputeId: "d1",
      raisedById: "u1",
      raisedByType: "CONSUMER",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    domainEvents.emitIncentiveCredited({
      amount: 50,
      bookingId: "b1",
      ledgerEntryId: "l1",
      partnerId: "p1",
      reviewId: "r1",
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    expect(disputeHandler).toHaveBeenCalledOnce();
    expect(incentiveHandler).toHaveBeenCalledOnce();
    domainEvents.off("dispute:created", disputeHandler);
    domainEvents.off("incentive:credited", incentiveHandler);
  });
});