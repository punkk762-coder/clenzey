import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types";

const VARIANT: Record<
  BookingStatus,
  "default" | "signal" | "secondary" | "outline" | "success" | "warning" | "destructive" | "muted"
> = {
  PENDING: "muted",
  PAYMENT_PENDING: "warning",
  CONFIRMED: "signal",
  PROFESSIONAL_ASSIGNED: "default",
  PROFESSIONAL_EN_ROUTE: "default",
  CHECKED_IN: "default",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
  NO_SHOW: "warning",
};

const LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  PAYMENT_PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROFESSIONAL_ASSIGNED: "Assigned",
  PROFESSIONAL_EN_ROUTE: "En route",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  NO_SHOW: "No show",
};

export const BOOKING_STATUS_LABEL = LABEL;

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
