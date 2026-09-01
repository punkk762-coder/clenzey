import { beforeAll } from "vitest";

import { ensureRedisReady, isRedisConfigured } from "../../src/configs/redisConfig.ts";

beforeAll(async () => {
  if (!isRedisConfigured()) return;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await ensureRedisReady();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error("Redis did not become ready for E2E tests.");
}, 30_000);
