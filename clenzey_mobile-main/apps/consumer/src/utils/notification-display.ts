import type { Notification } from '@clenzey/types';
import type { SemanticTone } from '@clenzey/design-system';
import { getBookingStatusLabel } from './booking-status';

const BOOKING_STATUS_PATTERN = /\b([A-Z]{2,}(?:_[A-Z]+)+)\b/g;

function humanizeSnakeCase(value: string): string {
  if (!value.includes('_')) return value;

  return getBookingStatusLabel(value);
}

export function formatNotificationTitle(title?: string | null): string {
  const trimmed = (title ?? '').trim();
  if (!trimmed) return 'Notification';

  const cancelledMatch = trimmed.match(/^Booking\s+Cancelled$/i);
  if (cancelledMatch) return 'Booking cancelled';

  const bookingStatusMatch = trimmed.match(/^Booking\s+([A-Z_]+)$/i);
  if (bookingStatusMatch) {
    const status = bookingStatusMatch[1].toUpperCase();
    if (status === 'CANCELLED') return 'Booking cancelled';
    return `Booking · ${humanizeSnakeCase(status)}`;
  }

  return trimmed.replace(BOOKING_STATUS_PATTERN, (match) => humanizeSnakeCase(match));
}

export function formatNotificationBody(body?: string | null): string {
  const trimmed = (body ?? '').trim();
  if (!trimmed) return '';

  return trimmed
    .replace(BOOKING_STATUS_PATTERN, (match) => humanizeSnakeCase(match).toLowerCase())
    .replace(/\s+/g, ' ');
}

function extractBookingStatus(notification: Notification): string | undefined {
  const metadataStatus = notification.metadata?.status;
  if (typeof metadataStatus === 'string') {
    return metadataStatus.toUpperCase();
  }

  const title = notification.title ?? '';
  const body = notification.body ?? '';

  const fromTitle = title.match(/^Booking\s+([A-Z_]+)$/i)?.[1];
  if (fromTitle) return fromTitle.toUpperCase();

  const fromBody = body.match(BOOKING_STATUS_PATTERN)?.[0];
  return fromBody?.toUpperCase();
}

export function getNotificationTone(notification: Notification): SemanticTone {
  const type = (notification.type ?? '').toLowerCase();
  const status = extractBookingStatus(notification);
  const title = (notification.title ?? '').toLowerCase();

  if (
    type.includes('cancel') ||
    status === 'CANCELLED' ||
    title.includes('cancelled')
  ) {
    return 'error';
  }

  if (
    type.includes('payment_failed') ||
    type.includes('failed') ||
    status === 'NO_SHOW' ||
    status === 'REFUNDED'
  ) {
    return 'error';
  }

  if (
    type.includes('completed') ||
    type.includes('payment_captured') ||
    type.includes('confirmed') ||
    status === 'COMPLETED'
  ) {
    return 'success';
  }

  if (
    type.includes('payment') ||
    status === 'PAYMENT_PENDING' ||
    status === 'PENDING'
  ) {
    return 'warning';
  }

  if (
    type.includes('assigned') ||
    type.includes('en_route') ||
    type.includes('checked_in') ||
    type.includes('in_progress') ||
    status === 'PROFESSIONAL_ASSIGNED' ||
    status === 'PROFESSIONAL_EN_ROUTE' ||
    status === 'CHECKED_IN' ||
    status === 'IN_PROGRESS'
  ) {
    return 'info';
  }

  return 'primary';
}

export function formatNotificationTimestamp(dateStr?: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}
