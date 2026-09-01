import type { BookingStatus } from "@/types";

/**
 * Admin-allowed booking transitions — mirrors clenzey_backend stateMachine.ts
 * for actor ADMIN. Payment/confirmation from PENDING and PAYMENT_PENDING are
 * SYSTEM-only; use assign flow for PROFESSIONAL_ASSIGNED from CONFIRMED.
 */
export const ADMIN_TRANSITIONS_BY_STATUS: Partial<
  Record<BookingStatus, BookingStatus[]>
> = {
  PENDING: ["CANCELLED"],
  PAYMENT_PENDING: ["CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  PROFESSIONAL_ASSIGNED: [
    "PROFESSIONAL_EN_ROUTE",
    "CANCELLED",
    "NO_SHOW",
    "CONFIRMED",
  ],
  PROFESSIONAL_EN_ROUTE: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  CANCELLED: ["REFUNDED"],
  COMPLETED: ["REFUNDED"],
  NO_SHOW: ["REFUNDED"],
};

/** Context shown when admin cannot drive a lifecycle step from the UI. */
export const ADMIN_TRANSITION_NOTES: Partial<Record<BookingStatus, string>> = {
  PENDING:
    "Awaiting payment or confirmation — these steps run automatically via Razorpay and system workflows.",
  PAYMENT_PENDING:
    "Confirmation happens automatically once payment is captured.",
  CONFIRMED:
    "Use “Assign partner” to move this booking to Professional assigned.",
};

/** Partner workflow requirements — admins can override these in the UI. */
export const PARTNER_TRANSITION_REQUIREMENTS: Partial<
  Record<BookingStatus, string>
> = {
  IN_PROGRESS: "Partners must upload at least one before-photo to start work.",
  COMPLETED: "Partners must upload at least one after-photo to complete.",
};

export function getAdminNextStatuses(status: BookingStatus): BookingStatus[] {
  return ADMIN_TRANSITIONS_BY_STATUS[status] ?? [];
}

export function canAdminAssignPartner(
  status: BookingStatus,
  partnerId: string | null | undefined,
): boolean {
  return status === "CONFIRMED" && !partnerId;
}
