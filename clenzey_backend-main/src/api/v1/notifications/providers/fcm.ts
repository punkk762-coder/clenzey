import { getFirebaseMessaging } from "../../../../configs/firebaseConfig.ts";
import logger from "../../../../configs/loggerConfig.ts";
import * as deviceTokenService from "../../device-tokens/service.ts";

export type PushPayload = {
  body: string;
  data?: Record<string, string>;
  title: string;
  tokens: string[];
};

export type PushResult = {
  failedTokens: string[];
  successCount: number;
};

/**
 * Sends push notifications to multiple devices via Firebase Cloud Messaging.
 * Uses `sendEachForMulticast` for batch delivery.
 * On INVALID_TOKEN or UNREGISTERED errors, removes the stale token from storage.
 */
export const sendPush = async (payload: PushPayload): Promise<PushResult> => {
  const messaging = getFirebaseMessaging();

  if (!messaging) {
    logger.warning(
      "Firebase messaging not initialized. Skipping push notification.",
    );
    return { failedTokens: [], successCount: 0 };
  }

  if (payload.tokens.length === 0) {
    return { failedTokens: [], successCount: 0 };
  }

  const message = {
    ...(payload.data ? { data: payload.data } : {}),
    notification: {
      body: payload.body,
      title: payload.title,
    },
    tokens: payload.tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);

    const failedTokens: string[] = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code ?? "";
        const token = payload.tokens[idx] as string;

        logger.error(`FCM send failed for token ${token}`, {
          errorCode,
          errorMessage: resp.error?.message,
        });

        // Remove invalid/unregistered tokens
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(token);
          // Fire-and-forget token removal
          deviceTokenService.removeInvalidToken(token).catch((err) => {
            logger.error(`Failed to remove invalid token: ${token}`, {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
    });

    logger.info(
      `FCM multicast result: ${response.successCount} success, ${response.failureCount} failures`,
    );

    return {
      failedTokens,
      successCount: response.successCount,
    };
  } catch (err) {
    logger.error("FCM multicast send failed entirely", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
};
