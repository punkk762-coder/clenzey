import type { Redis } from "ioredis";

import { getRedisClient } from "../configs/redisConfig.ts";
import { memoryCooldownStore } from "./memoryCooldownStore.ts";

export const createRedisCooldownStore = (redis: Redis) => ({
  async get(key: string) {
    const value = await redis.get(key);
    return value !== null ? Number(value) : null;
  },
  async set(key: string, value: number, ttlMs: number) {
    await redis.set(key, String(value), "PX", ttlMs);
  },
});

export const getCooldownStore = () => {
  const redis = getRedisClient();
  if (redis) {
    return createRedisCooldownStore(redis);
  }
  return null;
};

export { memoryCooldownStore };
