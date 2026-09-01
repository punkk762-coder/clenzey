import { and, eq, inArray } from "drizzle-orm";

import db from "../../../db/index.ts";
import { bookings } from "../../../db/schema.ts";
import { bookingEvents } from "../../../realtime/bookingEvents.ts";
import * as etaService from "../eta/service.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LocationPingPayload = {
  heading?: number | null;
  latitude: number;
  longitude: number;
  speed?: number | null;
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

// ─── Staleness Monitor ───────────────────────────────────────────────────────

const STALE_TIMEOUT_MS = 30_000; // 30 seconds

type StalenessEntry = {
  lastReceivedAt: string;
  timer: NodeJS.Timeout;
};

const stalenessTimers = new Map<string, StalenessEntry>();

// ─── Internal Helpers ────────────────────────────────────────────────────────

const STREAMABLE_STATUSES = [
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
] as const;

/**
 * Find the active booking (EN_ROUTE or CHECKED_IN) for a given partner.
 */
const findActiveStreamableBooking = async (partnerId: string) => {
  const [record] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.partnerId, partnerId),
        inArray(bookings.status, [...STREAMABLE_STATUSES]),
      ),
    )
    .limit(1);
  return record ?? null;
};

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Handle an incoming partner location ping.
 * If the partner has an active EN_ROUTE or CHECKED_IN booking, emit a
 * `partner:location_stream` event to the consumer. ETA is computed only
 * for EN_ROUTE bookings.
 */
export const handlePartnerPing = async (
  partnerId: string,
  payload: LocationPingPayload,
): Promise<void> => {
  const booking = await findActiveStreamableBooking(partnerId);
  if (!booking) return; // No active streamable booking — silently skip

  const now = new Date().toISOString();

  const event: PartnerLocationStreamEvent = {
    bookingId: booking.id,
    heading: payload.heading ?? null,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed: payload.speed ?? null,
    timestamp: now,
    ...(booking.consumerId ? { consumerId: booking.consumerId } : {}),
  };

  // Compute ETA only for EN_ROUTE bookings
  if (booking.status === "PROFESSIONAL_EN_ROUTE") {
    try {
      const eta = await etaService.recalculateETA(
        booking.id,
        payload.latitude,
        payload.longitude,
      );
      event.etaMinutes = eta.etaMinutes;
    } catch {
      // ETA calculation failed — flag it as unavailable
      event.etaUnavailable = true;
    }
  }

  // Emit to booking event bus (socket server will pipe to rooms)
  bookingEvents.emitPartnerLocationStream(event);

  // Reset staleness timer for this booking
  resetStalenessTimer(booking.id, now, booking.consumerId);
};

/**
 * Start the staleness monitor for a booking. If no pings arrive within 30s,
 * a stale location event is emitted.
 */
export const startStalenessMonitor = (
  bookingId: string,
  consumerId?: string,
): void => {
  // Don't create a duplicate if already monitoring
  if (stalenessTimers.has(bookingId)) return;

  const now = new Date().toISOString();
  const timer = setTimeout(() => {
    emitStaleEvent(bookingId, now, consumerId);
  }, STALE_TIMEOUT_MS);

  // Prevent timer from keeping the Node.js process alive
  timer.unref();

  stalenessTimers.set(bookingId, { lastReceivedAt: now, timer });
};

/**
 * Stop the staleness monitor for a booking (e.g., when booking transitions
 * out of a streamable state).
 */
export const stopStalenessMonitor = (bookingId: string): void => {
  const entry = stalenessTimers.get(bookingId);
  if (entry) {
    clearTimeout(entry.timer);
    stalenessTimers.delete(bookingId);
  }
};

// ─── Internal ────────────────────────────────────────────────────────────────

/**
 * Reset the staleness timer. Called on each successful ping.
 */
const resetStalenessTimer = (
  bookingId: string,
  lastReceivedAt: string,
  consumerId?: string | null,
): void => {
  const existing = stalenessTimers.get(bookingId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    emitStaleEvent(bookingId, lastReceivedAt, consumerId);
  }, STALE_TIMEOUT_MS);

  timer.unref();

  stalenessTimers.set(bookingId, { lastReceivedAt, timer });
};

/**
 * Emit a stale location event via the booking event bus.
 */
const emitStaleEvent = (
  bookingId: string,
  lastReceivedAt: string,
  consumerId?: string | null,
): void => {
  const staleEvent: StaleLocationEvent = {
    bookingId,
    lastReceivedAt,
    timestamp: new Date().toISOString(),
    ...(consumerId ? { consumerId } : {}),
  };

  bookingEvents.emitPartnerLocationStale(staleEvent);
  stalenessTimers.delete(bookingId);
};

// ─── Test Utilities (exported for unit testing) ──────────────────────────────

/** @internal — exposed for testing only */
export const _testing = {
  getStalenessTimers: () => stalenessTimers,
  STALE_TIMEOUT_MS,
};
