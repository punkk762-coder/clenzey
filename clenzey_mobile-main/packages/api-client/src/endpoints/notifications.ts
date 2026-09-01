import { AxiosInstance } from 'axios';
import { Notification } from '@clenzey/types';

/**
 * Payload for registering a device push notification token.
 */
export type PushPlatform = 'ANDROID' | 'IOS';

export interface RegisterTokenPayload {
  token: string;
  platform: PushPlatform;
}

/**
 * Payload for removing a device push notification token.
 */
export interface RemoveTokenPayload {
  token: string;
}

/**
 * Params for listing notifications.
 */
export interface ListNotificationsParams {
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Creates the notifications endpoint module.
 *
 * Provides typed methods for managing push notification tokens and
 * the notification inbox:
 * - registerToken: Register a device token for push notifications
 * - removeToken: Remove a device token (e.g., on logout)
 * - list: Fetch paginated notifications with optional read filter
 * - markRead: Mark a single notification as read
 * - markAllRead: Mark all notifications as read
 */
export function createNotificationsEndpoints(client: AxiosInstance) {
  return {
    /**
     * POST /api/v1/{prefix}/device-token — Register device token.
     * @param prefix - Role-based prefix: 'consumers' or 'partners'
     */
    registerToken: (prefix: string, data: RegisterTokenPayload) =>
      client.post<void>(`/api/v1/${prefix}/device-token`, data),

    /**
     * DELETE /api/v1/{prefix}/device-token — Remove device token.
     * @param prefix - Role-based prefix: 'consumers' or 'partners'
     */
    removeToken: (prefix: string, data: RemoveTokenPayload) =>
      client.delete<void>(`/api/v1/${prefix}/device-token`, { data }),

    /** GET /api/v1/notifications — List notifications with optional filters */
    list: (params?: ListNotificationsParams) =>
      client.get<Notification[]>('/api/v1/notifications', { params }),

    /** PATCH /api/v1/notifications/:id/read — Mark a notification as read */
    markRead: (id: string) =>
      client.patch<Notification>(`/api/v1/notifications/${id}/read`),

    /** POST /api/v1/notifications/read-all — Mark all notifications as read */
    markAllRead: () =>
      client.post<void>('/api/v1/notifications/read-all'),
  };
}
