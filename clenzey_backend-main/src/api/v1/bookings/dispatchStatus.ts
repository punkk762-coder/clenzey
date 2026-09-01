import { dispatchConfig } from "../../../configs/dispatchConfig.ts";
import type { BookingRecord, BookingHistoryRecord } from "./repository.ts";

export type DispatchPhase =
  | "ASSIGNED"
  | "ESCALATED"
  | "FAILED"
  | "NOT_APPLICABLE"
  | "PENDING"
  | "SEARCHING";

export type BookingDispatchStatus = {
  attemptCount: number;
  escalatedAt: null | string;
  message: string;
  phase: DispatchPhase;
  radiusMeters: null | number;
  searchEndsAt: null | string;
  searchStartedAt: null | string;
};

const SCHEDULED_IMMEDIATE_ASSIGN_MS = 24 * 60 * 60 * 1000;

const metaType = (entry: BookingHistoryRecord): null | string => {
  if (!entry.metadata || typeof entry.metadata !== "object") return null;
  return (entry.metadata as Record<string, unknown>)["type"] as null | string;
};

const metaString = (
  entry: BookingHistoryRecord,
  key: string,
): null | string => {
  if (!entry.metadata || typeof entry.metadata !== "object") return null;
  const value = (entry.metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

const isDispatchFailed = (history: BookingHistoryRecord[]): boolean =>
  history.some((entry) => metaType(entry) === "DISPATCH_FAILED");

const findEscalationEntry = (
  history: BookingHistoryRecord[],
): BookingHistoryRecord | undefined =>
  history.find((entry) => metaType(entry) === "DISPATCH_ESCALATED");

const dispatchAttempts = (history: BookingHistoryRecord[]): BookingHistoryRecord[] =>
  history.filter((entry) => metaType(entry) === "DISPATCH_ATTEMPT");

export const resolveSearchStartedAt = (
  booking: Pick<BookingRecord, "confirmedAt">,
  history: BookingHistoryRecord[],
): string => {
  const attempts = dispatchAttempts(history);
  const fromAttempt = attempts[0]
    ? metaString(attempts[0], "firstDispatchAt")
    : null;
  if (fromAttempt) return fromAttempt;

  if (booking.confirmedAt) {
    return booking.confirmedAt.toISOString();
  }

  return new Date().toISOString();
};

export const resolveDispatchMetadata = (
  history: BookingHistoryRecord[],
): {
  attemptCount: number;
  escalatedAt?: string;
  firstDispatchAt?: string;
  radiusMeters: number;
} => {
  const attempts = dispatchAttempts(history);
  const latestAttempt = attempts.at(-1);
  const latestMeta = (latestAttempt?.metadata ?? {}) as Record<string, unknown>;
  const escalationEntry = findEscalationEntry(history);

  return {
    attemptCount: attempts.length,
    ...(escalationEntry
      ? {
          escalatedAt:
            metaString(escalationEntry, "escalatedAt") ??
            escalationEntry.createdAt.toISOString(),
        }
      : {}),
    ...(latestMeta["firstDispatchAt"]
      ? { firstDispatchAt: latestMeta["firstDispatchAt"] as string }
      : attempts[0]
        ? {
            firstDispatchAt:
              metaString(attempts[0], "firstDispatchAt") ??
              attempts[0].createdAt.toISOString(),
          }
        : {}),
    radiusMeters: Number(
      latestMeta["radiusMeters"] ?? dispatchConfig.initialRadiusM,
    ),
  };
};

export const resolveDispatchStatus = (
  booking: BookingRecord,
  history: BookingHistoryRecord[],
): BookingDispatchStatus => {
  const dispatchMeta = resolveDispatchMetadata(history);
  const searchStartedAt = resolveSearchStartedAt(booking, history);
  const searchEndsAt = new Date(
    new Date(searchStartedAt).getTime() +
      dispatchConfig.escalationMin * 60_000,
  ).toISOString();

  if (booking.partnerId) {
    return {
      attemptCount: dispatchMeta.attemptCount,
      escalatedAt: dispatchMeta.escalatedAt ?? null,
      message: "A partner has been assigned to your booking.",
      phase: "ASSIGNED",
      radiusMeters: dispatchMeta.radiusMeters,
      searchEndsAt: null,
      searchStartedAt: null,
    };
  }

  if (booking.status === "CANCELLED" && isDispatchFailed(history)) {
    return {
      attemptCount: dispatchMeta.attemptCount,
      escalatedAt: dispatchMeta.escalatedAt ?? null,
      message: "No partner was available. Your booking has been cancelled.",
      phase: "FAILED",
      radiusMeters: dispatchMeta.radiusMeters,
      searchEndsAt,
      searchStartedAt,
    };
  }

  if (booking.status !== "CONFIRMED") {
    return {
      attemptCount: 0,
      escalatedAt: null,
      message: "Partner assignment is not active for this booking.",
      phase: "NOT_APPLICABLE",
      radiusMeters: null,
      searchEndsAt: null,
      searchStartedAt: null,
    };
  }

  if (dispatchMeta.escalatedAt) {
    return {
      attemptCount: dispatchMeta.attemptCount,
      escalatedAt: dispatchMeta.escalatedAt,
      message:
        "We're still finding the best partner. Our team has been notified and will assign someone shortly.",
      phase: "ESCALATED",
      radiusMeters: dispatchMeta.radiusMeters,
      searchEndsAt,
      searchStartedAt,
    };
  }

  if (booking.bookingType === "INSTANT") {
    return {
      attemptCount: dispatchMeta.attemptCount,
      escalatedAt: null,
      message: "Searching for an available partner near you.",
      phase: "SEARCHING",
      radiusMeters: dispatchMeta.radiusMeters,
      searchEndsAt,
      searchStartedAt,
    };
  }

  if (booking.bookingType === "SCHEDULED" && booking.scheduledAt) {
    const msUntilService = booking.scheduledAt.getTime() - Date.now();
    if (msUntilService > SCHEDULED_IMMEDIATE_ASSIGN_MS) {
      return {
        attemptCount: 0,
        escalatedAt: null,
        message:
          "A partner will be assigned before your scheduled appointment.",
        phase: "PENDING",
        radiusMeters: null,
        searchEndsAt: null,
        searchStartedAt: null,
      };
    }

    return {
      attemptCount: dispatchMeta.attemptCount,
      escalatedAt: null,
      message: "Assigning a partner for your scheduled booking.",
      phase: "SEARCHING",
      radiusMeters: dispatchMeta.radiusMeters,
      searchEndsAt: null,
      searchStartedAt,
    };
  }

  return {
    attemptCount: 0,
    escalatedAt: null,
    message: "Partner assignment is not active for this booking.",
    phase: "NOT_APPLICABLE",
    radiusMeters: null,
    searchEndsAt: null,
    searchStartedAt: null,
  };
};
