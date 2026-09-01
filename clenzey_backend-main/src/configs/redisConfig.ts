import { Redis } from "ioredis";

import { envConfig } from "./environmentConfig.ts";
import logger from "./loggerConfig.ts";

const ERROR_LOG_INTERVAL_MS = 5_000;

let client: Redis | null = null;
let lastErrorLogAt = 0;
let readyPromise: Promise<void> | null = null;

const waitForRedisReady = (redis: Redis): Promise<void> => {
  if (redis.status === "ready") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      redis.off("ready", onReady);
      redis.off("error", onError);
    };

    redis.once("ready", onReady);
    redis.once("error", onError);
  });
};

export const ensureRedisReady = async (): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) return;

  if (!readyPromise) {
    readyPromise = waitForRedisReady(redis);
  }

  await readyPromise;
};

export const isRedisConfigured = (): boolean =>
  Boolean(envConfig.REDIS_URL && envConfig.REDIS_URL.length > 0);

export const getRedisClient = (): Redis | null => {
  if (!isRedisConfigured()) return null;

  if (!client) {
    client = new Redis(envConfig.REDIS_URL!, {
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5_000);
      },
    });

    client.on("error", (err: Error) => {
      const now = Date.now();
      if (now - lastErrorLogAt < ERROR_LOG_INTERVAL_MS) return;

      lastErrorLogAt = now;
      logger.warning("Redis client error", { error: err.message });
    });

    client.on("connect", () => {
      lastErrorLogAt = 0;
      logger.info("Redis connected");
    });
  }

  return client;
};

export const pingRedis = async (): Promise<boolean> => {
  const redis = getRedisClient();
  if (!redis) return true;

  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
};

export const closeRedis = async (): Promise<void> => {
  if (!client) return;

  const toClose = client;
  client = null;
  readyPromise = null;
  lastErrorLogAt = 0;
  await toClose.quit().catch(() => {
    toClose.disconnect();
  });
};
