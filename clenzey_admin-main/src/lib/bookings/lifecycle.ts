import { BOOKING_STATUS_LABEL } from "@/components/bookings/StatusBadge";
import type {
  BookingDetail,
  BookingStatus,
  BookingStatusHistoryItem,
} from "@/types";

const MAIN_FLOW: BookingStatus[] = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
];

const TERMINAL_STATUSES: BookingStatus[] = [
  "CANCELLED",
  "REFUNDED",
  "NO_SHOW",
];

const LEGACY_TIMESTAMP_BY_STATUS: Partial<
  Record<BookingStatus, keyof BookingDetail>
> = {
  CONFIRMED: "confirmedAt",
  PROFESSIONAL_ASSIGNED: "partnerAssignedAt",
  PROFESSIONAL_EN_ROUTE: "enRouteAt",
  CHECKED_IN: "checkedInAt",
  IN_PROGRESS: "startedAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

export type LifecycleStep = {
  status: BookingStatus;
  label: string;
  at: string | null;
  isCurrent: boolean;
  isCompleted: boolean;
};

function firstReachedAt(
  history: BookingStatusHistoryItem[],
  status: BookingStatus,
): string | null {
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return sorted.find((item) => item.toStatus === status)?.createdAt ?? null;
}

function legacyTimestamp(
  booking: BookingDetail,
  status: BookingStatus,
): string | null {
  const key = LEGACY_TIMESTAMP_BY_STATUS[status];
  if (!key) return null;
  const value = booking[key];
  return typeof value === "string" ? value : null;
}

function timestampForStatus(
  booking: BookingDetail,
  status: BookingStatus,
): string | null {
  if (status === "PENDING") return booking.createdAt;
  return (
    firstReachedAt(booking.history ?? [], status) ??
    legacyTimestamp(booking, status) ??
    (booking.status === status ? booking.updatedAt : null)
  );
}

export function buildLifecycleSteps(booking: BookingDetail): LifecycleStep[] {
  const history = booking.history ?? [];
  const reached = new Set<BookingStatus>(
    history.map((item) => item.toStatus).filter(Boolean) as BookingStatus[],
  );
  reached.add("PENDING");

  const currentIndex = MAIN_FLOW.indexOf(booking.status);
  const isTerminal = TERMINAL_STATUSES.includes(booking.status);

  const steps: LifecycleStep[] = MAIN_FLOW.map((status, index) => {
    const at = timestampForStatus(booking, status);
    const isCurrent = booking.status === status;
    const isCompleted =
      !isTerminal &&
      (reached.has(status) || (currentIndex >= 0 && index < currentIndex));

    return {
      status,
      label: BOOKING_STATUS_LABEL[status],
      at,
      isCurrent,
      isCompleted,
    };
  });

  if (isTerminal) {
    steps.push({
      status: booking.status,
      label: BOOKING_STATUS_LABEL[booking.status],
      at:
        booking.cancelledAt ??
        timestampForStatus(booking, booking.status) ??
        booking.updatedAt,
      isCurrent: true,
      isCompleted: true,
    });
  }

  return steps;
}
