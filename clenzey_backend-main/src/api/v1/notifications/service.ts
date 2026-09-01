import { eq } from "drizzle-orm";

import db from "../../../db/index.ts";
import { users } from "../../../db/schema.ts";
import logger from "../../../configs/loggerConfig.ts";
import { NotFoundError } from "../../../errors/appErrors.ts";
import * as deviceTokenService from "../device-tokens/service.ts";

import { sendPush, type PushPayload } from "./providers/fcm.ts";
import { sendSms } from "./providers/sms.ts";
import * as repo from "./repository.ts";
import type { NotificationRecord } from "./repository.ts";

export type CreateNotificationInput = {
  body: string;
  channel: "PUSH" | "SMS" | "EMAIL" | "IN_APP";
  metadata?: Record<string, unknown>;
  recipientId: string;
  recipientType: "CONSUMER" | "PARTNER" | "ADMIN";
  title: string;
};

/**
 * Create a notification record and dispatch to the appropriate channel.
 *
 * - IN_APP: just stores the notification (insert is enough)
 * - PUSH: looks up user device tokens and sends via FCM
 * - SMS: looks up user phone from users table and sends via MSG91
 * - EMAIL: stores the notification (email provider not yet implemented)
 */
export const createNotification = async (
  input: CreateNotificationInput,
): Promise<NotificationRecord> => {
  // Always persist the notification record
  const record = await repo.insert({
    body: input.body,
    channel: input.channel,
    metadata: input.metadata ?? null,
    recipientId: input.recipientId,
    recipientType: input.recipientType,
    title: input.title,
  });

  // Dispatch to external channel
  try {
    switch (input.channel) {
      case "PUSH":
        await dispatchPush(input);
        break;
      case "SMS":
        await dispatchSms(input);
        break;
      case "EMAIL":
        // Email provider not yet implemented — record is stored for future delivery
        logger.info("Email notification stored (provider not implemented)", {
          recipientId: input.recipientId,
        });
        break;
      case "IN_APP":
        // No external dispatch needed — record is already stored
        break;
    }
  } catch (err) {
    // Log failure but don't throw — the notification record is already persisted
    logger.error("Failed to dispatch notification via external channel", {
      channel: input.channel,
      error: err instanceof Error ? err.message : String(err),
      recipientId: input.recipientId,
    });
  }

  return record;
};

/**
 * Send notifications in batch. Calls createNotification for each input.
 */
export const sendBatch = async (
  inputs: CreateNotificationInput[],
): Promise<void> => {
  await Promise.allSettled(
    inputs.map((input) => createNotification(input)),
  );
};

/**
 * List notifications for a user with pagination and optional read/unread filter.
 */
export const listNotifications = async (
  userId: string,
  opts: { isRead?: boolean; limit?: number; offset?: number } = {},
): Promise<{ notifications: NotificationRecord[]; total: number }> => {
  return await repo.list(userId, opts);
};

/**
 * Mark a single notification as read. Verifies it belongs to the user.
 */
export const markAsRead = async (
  id: string,
  userId: string,
): Promise<NotificationRecord> => {
  const record = await repo.markAsRead(id, userId);
  if (!record) {
    throw new NotFoundError("Notification not found");
  }
  return record;
};

/**
 * Mark all unread notifications as read for a user.
 */
export const markAllAsRead = async (
  userId: string,
): Promise<{ updated: number }> => {
  const updated = await repo.markAllAsRead(userId);
  return { updated };
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return await repo.countUnread(userId);
};

// --- Private dispatch helpers ---

/**
 * Look up user device tokens and send push notification via FCM.
 */
const dispatchPush = async (input: CreateNotificationInput): Promise<void> => {
  const tokens = await deviceTokenService.getTokensForUser(input.recipientId);

  if (tokens.length === 0) {
    logger.info("No device tokens found for push notification", {
      recipientId: input.recipientId,
    });
    return;
  }

  const pushPayload: PushPayload = {
    body: input.body,
    title: input.title,
    tokens: tokens.map((t) => t.deviceToken),
  };

  if (input.metadata) {
    pushPayload.data = Object.fromEntries(
      Object.entries(input.metadata).map(([k, v]) => [k, String(v)]),
    );
  }

  await sendPush(pushPayload);
};

/**
 * Look up user phone from users table and send SMS via MSG91.
 */
const dispatchSms = async (input: CreateNotificationInput): Promise<void> => {
  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, input.recipientId));

  if (!user) {
    logger.error("User not found for SMS notification", {
      recipientId: input.recipientId,
    });
    return;
  }

  await sendSms(user.phone, input.body);
};
