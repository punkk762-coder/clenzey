import logger from "../configs/loggerConfig.ts";
import { isRedisConfigured, pingRedis } from "../configs/redisConfig.ts";
import { pingDatabase } from "../db/index.ts";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type WaitForDependenciesOptions = {
  delayMs?: number;
  maxAttempts?: number;
};

export const waitForDependencies = async (
  options: WaitForDependenciesOptions = {},
): Promise<void> => {
  const { delayMs = 1_000, maxAttempts = 30 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const dbOk = await pingDatabase();
    const redisOk = isRedisConfigured() ? await pingRedis() : true;

    if (dbOk && redisOk) {
      if (attempt > 1) {
        logger.info("Dependencies ready", { attempt });
      }
      return;
    }

    logger.warning("Waiting for dependencies", {
      attempt,
      database: dbOk ? "ok" : "unavailable",
      maxAttempts,
      redis: !isRedisConfigured()
        ? "not configured"
        : redisOk
          ? "ok"
          : "unavailable",
    });

    await sleep(delayMs);
  }

  throw new Error("Dependencies not ready after maximum retries");
};
