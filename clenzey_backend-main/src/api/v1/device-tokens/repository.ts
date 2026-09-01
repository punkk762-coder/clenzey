import { and, eq } from "drizzle-orm";

import db from "../../../db/index.ts";
import { deviceTokens } from "../../../db/schema.ts";

export type DeviceTokenRecord = typeof deviceTokens.$inferSelect;
export type DeviceTokenInsert = typeof deviceTokens.$inferInsert;

/**
 * Upsert a device token. If the same device_token already exists,
 * update the user_id, user_type, platform, and updated_at.
 */
export const upsert = async (
  data: DeviceTokenInsert,
): Promise<DeviceTokenRecord> => {
  const [record] = await db
    .insert(deviceTokens)
    .values(data)
    .onConflictDoUpdate({
      target: deviceTokens.deviceToken,
      set: {
        platform: data.platform,
        updatedAt: new Date(),
        userId: data.userId,
        userType: data.userType,
      },
    })
    .returning();
  return record!;
};

/**
 * Remove a specific device token for a given user.
 * Used on logout to disassociate the device from the user.
 */
export const remove = async (
  deviceToken: string,
  userId: string,
): Promise<void> => {
  await db
    .delete(deviceTokens)
    .where(
      and(
        eq(deviceTokens.deviceToken, deviceToken),
        eq(deviceTokens.userId, userId),
      ),
    );
};

/**
 * Remove a device token regardless of user ownership.
 * Called when FCM returns INVALID_TOKEN or UNREGISTERED errors.
 */
export const removeInvalid = async (deviceToken: string): Promise<void> => {
  await db
    .delete(deviceTokens)
    .where(eq(deviceTokens.deviceToken, deviceToken));
};

/**
 * Get all device tokens registered for a given user.
 */
export const getTokensForUser = async (
  userId: string,
): Promise<DeviceTokenRecord[]> => {
  return await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));
};
