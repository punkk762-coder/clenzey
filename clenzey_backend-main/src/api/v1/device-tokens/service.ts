import * as repo from "./repository.ts";
import type { DeviceTokenRecord } from "./repository.ts";

type RegisterTokenInput = {
  deviceToken: string;
  platform: "ANDROID" | "IOS";
  userId: string;
  userType: "CONSUMER" | "PARTNER";
};

/**
 * Register (or re-register) a device token for push notifications.
 * Uses upsert so re-submitting the same token just updates the owner.
 */
export const registerToken = async (
  input: RegisterTokenInput,
): Promise<DeviceTokenRecord> => {
  return await repo.upsert({
    deviceToken: input.deviceToken,
    platform: input.platform,
    userId: input.userId,
    userType: input.userType,
  });
};

/**
 * Remove a device token for a specific user (e.g. on logout).
 */
export const removeToken = async (
  deviceToken: string,
  userId: string,
): Promise<void> => {
  await repo.remove(deviceToken, userId);
};

/**
 * Remove an invalid device token regardless of owner.
 * Called when FCM returns INVALID_TOKEN or UNREGISTERED error codes.
 */
export const removeInvalidToken = async (
  deviceToken: string,
): Promise<void> => {
  await repo.removeInvalid(deviceToken);
};

/**
 * Retrieve all device tokens for a user (supports multiple devices).
 */
export const getTokensForUser = async (
  userId: string,
): Promise<DeviceTokenRecord[]> => {
  return await repo.getTokensForUser(userId);
};
