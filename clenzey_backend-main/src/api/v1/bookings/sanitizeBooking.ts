import type { BookingStatus } from "./stateMachine.ts";
import { CONSUMER_VISIBLE_CODE_STATUSES } from "./checkInCode.ts";

type ActorType = "ADMIN" | "CONSUMER" | "PARTNER" | "SYSTEM";

/**
 * Redact check-in code based on actor and booking status.
 * Mutates a shallow copy — never returns the raw secret to partners.
 */
export const sanitizeBookingCheckInCode = <T extends {
  checkInCode?: string | null;
  status: BookingStatus;
}>(
  booking: T,
  actorType: ActorType,
): T => {
  const copy = { ...booking };

  if (actorType === "PARTNER") {
    delete (copy as { checkInCode?: string | null }).checkInCode;
    return copy;
  }

  if (actorType === "CONSUMER") {
    if (!CONSUMER_VISIBLE_CODE_STATUSES.includes(booking.status)) {
      delete (copy as { checkInCode?: string | null }).checkInCode;
    }
    return copy;
  }

  // ADMIN / SYSTEM — keep code for support on non-terminal if present
  return copy;
};

export const sanitizeBookingsCheckInCode = <T extends {
  checkInCode?: string | null;
  status: BookingStatus;
}>(
  bookings: T[],
  actorType: ActorType,
): T[] => bookings.map((b) => sanitizeBookingCheckInCode(b, actorType));
