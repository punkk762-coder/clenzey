import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { notifications } from "../../../db/schema.ts";

export type NotificationRecord = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

/**
 * Insert a new notification record.
 */
export const insert = async (
  data: NotificationInsert,
): Promise<NotificationRecord> => {
  const [record] = await db.insert(notifications).values(data).returning();
  return record!;
};

/**
 * List notifications for a specific user with pagination and optional read/unread filter.
 */
export const list = async (
  recipientId: string,
  opts: { isRead?: boolean; limit?: number; offset?: number } = {},
): Promise<{ notifications: NotificationRecord[]; total: number }> => {
  const { isRead, limit = 20, offset = 0 } = opts;

  const conditions = [eq(notifications.recipientId, recipientId)];

  if (isRead === true) {
    conditions.push(sql`${notifications.readAt} IS NOT NULL`);
  } else if (isRead === false) {
    conditions.push(isNull(notifications.readAt));
  }

  const whereClause = and(...conditions);

  const [items, [countResult]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(notifications)
      .where(whereClause),
  ]);

  return {
    notifications: items,
    total: countResult?.count ?? 0,
  };
};

/**
 * Mark a specific notification as read by setting readAt to now.
 * Returns the updated record or null if not found/not owned by user.
 */
export const markAsRead = async (
  id: string,
  userId: string,
): Promise<NotificationRecord | null> => {
  const [record] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, userId),
      ),
    )
    .returning();
  return record ?? null;
};

/**
 * Mark all unread notifications as read for a specific user.
 * Returns the count of updated notifications.
 */
export const markAllAsRead = async (
  userId: string,
): Promise<number> => {
  const result = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return result.length;
};

export const countUnread = async (recipientId: string): Promise<number> => {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
      ),
    );

  return row?.count ?? 0;
};
