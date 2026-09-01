import type { Notification } from '@clenzey/types';

export interface NormalizedNotificationsList {
  notifications: Notification[];
  total: number;
  unreadCount?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeNotification(value: unknown): Notification | null {
  const record = asRecord(value);
  if (!record || record.id == null || record.id === '') {
    return null;
  }

  return {
    id: String(record.id),
    title: typeof record.title === 'string' ? record.title : 'Notification',
    body: typeof record.body === 'string' ? record.body : '',
    isRead: record.isRead === true,
    type: typeof record.type === 'string' ? record.type : '',
    metadata: asRecord(record.metadata) ?? undefined,
    createdAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : new Date().toISOString(),
  };
}

/**
 * Normalizes GET /notifications API responses.
 * Supports plain arrays and paginated shapes such as
 * `{ notifications, total }` or legacy `{ data: Notification[] }`.
 */
export function normalizeNotificationsListResponse(value: unknown): NormalizedNotificationsList {
  if (Array.isArray(value)) {
    const notifications = value
      .map(normalizeNotification)
      .filter((item): item is Notification => item != null);
    return { notifications, total: notifications.length };
  }

  const record = asRecord(value);
  if (!record) {
    return { notifications: [], total: 0 };
  }

  const rawNotifications = Array.isArray(record.notifications)
    ? record.notifications
    : Array.isArray(record.data)
      ? record.data
      : [];

  const notifications = rawNotifications
    .map(normalizeNotification)
    .filter((item): item is Notification => item != null);

  const total = typeof record.total === 'number' ? record.total : notifications.length;
  const unreadCount = typeof record.unreadCount === 'number' ? record.unreadCount : undefined;

  return { notifications, total, unreadCount };
}
