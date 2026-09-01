import { EventEmitter } from "node:events";

// ─── Event payload shapes ────────────────────────────────────────────
// Payloads are kept loose (unknown) to avoid circular imports between
// realtime ↔ api/v1/*/service files. Each emitter is a typed wrapper.

export type ServiceEventBase = {
  service: Record<string, unknown>;
  timestamp: string;
};
export type ServiceDeletedEvent = {
  serviceId: string;
  timestamp: string;
};

export type ZoneEventBase = {
  zone: Record<string, unknown>;
  timestamp: string;
};
export type ZoneDeletedEvent = {
  timestamp: string;
  zoneId: string;
};

export type AddressEventBase = {
  address: Record<string, unknown>;
  consumerId: string;
  timestamp: string;
};
export type AddressDeletedEvent = {
  addressId: string;
  consumerId: string;
  timestamp: string;
};

export type QuotationEventBase = {
  quotation: Record<string, unknown>;
  consumerId: string | null;
  timestamp: string;
};

export type DisputeCreatedEvent = {
  bookingId: string;
  disputeId: string;
  raisedById: string;
  raisedByType: "CONSUMER" | "PARTNER" | "ADMIN";
  timestamp: string;
};

export type IncentiveCreditedEvent = {
  amount: number;
  bookingId: string;
  ledgerEntryId: string;
  partnerId: string;
  reviewId: string;
  timestamp: string;
};

export type ReviewCreatedEvent = {
  consumerId: string;
  partnerId: string;
  rating: number;
  reviewId: string;
  timestamp: string;
};

export type EtaUpdatedEvent = {
  bookingId: string;
  etaMinutes: number;
  timestamp: string;
};

// ─── Bus ─────────────────────────────────────────────────────────────

class DomainEventBus extends EventEmitter {
  emitDisputeCreated(payload: DisputeCreatedEvent) {
    this.emit("dispute:created", payload);
  }
  emitQuotationCreated(payload: QuotationEventBase) {
    this.emit("quotation:created", payload);
  }
  emitQuotationUpdated(payload: QuotationEventBase) {
    this.emit("quotation:updated", payload);
  }
  emitServiceCreated(payload: ServiceEventBase) {
    this.emit("service:created", payload);
  }
  emitServiceUpdated(payload: ServiceEventBase) {
    this.emit("service:updated", payload);
  }
  emitServiceDeleted(payload: ServiceDeletedEvent) {
    this.emit("service:deleted", payload);
  }

  emitZoneCreated(payload: ZoneEventBase) {
    this.emit("zone:created", payload);
  }
  emitZoneUpdated(payload: ZoneEventBase) {
    this.emit("zone:updated", payload);
  }
  emitZoneDeleted(payload: ZoneDeletedEvent) {
    this.emit("zone:deleted", payload);
  }

  emitAddressCreated(payload: AddressEventBase) {
    this.emit("address:created", payload);
  }
  emitAddressUpdated(payload: AddressEventBase) {
    this.emit("address:updated", payload);
  }
  emitAddressDeleted(payload: AddressDeletedEvent) {
    this.emit("address:deleted", payload);
  }

  emitReviewCreated(payload: ReviewCreatedEvent) {
    this.emit("review:created", payload);
  }

  emitIncentiveCredited(payload: IncentiveCreditedEvent) {
    this.emit("incentive:credited", payload);
  }

  emitEtaUpdated(payload: EtaUpdatedEvent) {
    this.emit("eta:updated", payload);
  }
}

export const domainEvents = new DomainEventBus();
domainEvents.setMaxListeners(50);
