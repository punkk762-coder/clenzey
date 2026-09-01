import type { Options } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";

import { getRedisClient, isRedisConfigured } from "../configs/redisConfig.ts";

export const withRedisStore = (
  options: Partial<Options>,
): Partial<Options> => {
  if (!isRedisConfigured()) return options;

  const redis = getRedisClient();
  if (!redis) return options;

  return {
    ...options,
    store: new RedisStore({
      prefix: "rl:",
      sendCommand: (...args: string[]) =>
        redis.call(args[0]!, ...args.slice(1)) as Promise<RedisReply>,
    }),
  };
};
