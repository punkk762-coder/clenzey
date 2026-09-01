import type { BookingStatus } from '@clenzey/types';

const STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
  PENDING: 'Pending',
  PAYMENT_PENDING: 'Payment Pending',
  CONFIRMED: 'Confirmed',
  PROFESSIONAL_ASSIGNED: 'Professional Assigned',
  PROFESSIONAL_EN_ROUTE: 'Professional En Route',
  CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  NO_SHOW: 'No Show',
};

export function getBookingStatusLabel(status: BookingStatus | string): string {
  const known = STATUS_LABELS[status as BookingStatus];
  if (known) return known;

  return String(status)
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
