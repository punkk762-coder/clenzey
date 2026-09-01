import { EventEmitter } from "node:events";

import type { BookingStatus } from "../api/v1/bookings/stateMachine.ts";

export type BookingEventType =
  | "booking:cancelled"
  | "booking:checked_in"
  | "booking:completed"
  | "booking:confirmed"
  | "booking:created"
  | "booking:dispatch_escalated"
  | "booking:dispatch_searching"
  | "booking:en_route"
  | "booking:partner_assigned"
  | "booking:partner_proposed"
  | "booking:payment_pending"
  | "booking:refunded"
  | "booking:started"
  | "booking:status_changed"
  | "partner:location"
  | "partner:location_stream"
  | "partner:location_stale"
  | "partner:operational_status";

export type BookingEventBase = {
  bookingId: string;
  consumerId: string;
  partnerId?: null | string;
  timestamp: string;
};

export type BookingStatusChangedEvent = BookingEventBase & {
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
};

export type PartnerLocationEvent = {
  heading?: null | number;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  partnerId: string;
  speed?: null | number;
  timestamp: string;
};

export type PartnerLocationStreamEvent = {
  bookingId: string;
  consumerId?: string; // used for routing to consumer room
  heading: number | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string; // ISO 8601, server-generated
  etaMinutes?: number; // present only in EN_ROUTE state
  etaUnavailable?: boolean; // true when ETA calc fails
};

export type StaleLocationEvent = {
  bookingId: string;
  consumerId?: string; // used for routing to consumer room
  lastReceivedAt: string;
  timestamp: string;
};

export type PartnerOperationalStatusEvent = {
  partnerId: string;
  fullName: string | null;
  status: "OFFLINE" | "IDLE" | "IN_TRANSIT" | "ON_JOB";
  isOnline: boolean;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  activeBookingId: string | null;
  activeBookingNumber: string | null;
  activeBookingStatus: BookingStatus | null;
  timestamp: string;
};

export type DispatchSearchingEvent = BookingEventBase & {
  bookingType: "INSTANT" | "SCHEDULED";
  searchEndsAt: string;
  searchStartedAt: string;
};

export type DispatchEscalatedEvent = BookingEventBase & {
  escalatedAt: string;
  message: string;
  searchEndsAt: string;
};

const STATUS_TO_EVENT: Partial<Record<BookingStatus, BookingEventType>> = {
  CANCELLED: "booking:cancelled",
  CHECKED_IN: "booking:checked_in",
  COMPLETED: "booking:completed",
  CONFIRMED: "booking:confirmed",
  IN_PROGRESS: "booking:started",
  PAYMENT_PENDING: "booking:payment_pending",
  PROFESSIONAL_ASSIGNED: "booking:partner_assigned",
  PROFESSIONAL_EN_ROUTE: "booking:en_route",
  REFUNDED: "booking:refunded",
};

class BookingEventBus extends EventEmitter {
  emitBookingCreated(payload: BookingEventBase) {
    this.emit("booking:created", payload);
  }

  emitPartnerLocation(payload: PartnerLocationEvent) {
    this.emit("partner:location", payload);
  }

  emitPartnerLocationStream(payload: PartnerLocationStreamEvent) {
    this.emit("partner:location_stream", payload);
  }

  emitPartnerLocationStale(payload: StaleLocationEvent) {
    this.emit("partner:location_stale", payload);
  }

  emitPartnerOperationalStatus(payload: PartnerOperationalStatusEvent) {
    this.emit("partner:operational_status", payload);
  }

  emitPartnerProposed(payload: BookingEventBase & { candidates: string[] }) {
    this.emit("booking:partner_proposed", payload);
  }

  emitDispatchSearching(payload: DispatchSearchingEvent) {
    this.emit("booking:dispatch_searching", payload);
  }

  emitDispatchEscalated(payload: DispatchEscalatedEvent) {
    this.emit("booking:dispatch_escalated", payload);
  }

  emitStatusChanged(payload: BookingStatusChangedEvent) {
    this.emit("booking:status_changed", payload);
    const named = STATUS_TO_EVENT[payload.toStatus];
    if (named) this.emit(named, payload);
  }
}

export const bookingEvents = new BookingEventBus();
bookingEvents.setMaxListeners(50);
