import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/configs/redisConfig.ts", () => ({
  getRedisClient: vi.fn(),
}));

import * as redisConfig from "../src/configs/redisConfig.ts";
import {
  createRedisCooldownStore,
  getCooldownStore,
} from "../src/stores/redisCooldownStore.ts";

describe("createRedisCooldownStore", () => {
  it("get returns parsed number from redis", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue("12345"),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const store = createRedisCooldownStore(redis as never);

    expect(await store.get("otp:cooldown:+91999")).toBe(12345);
    expect(redis.get).toHaveBeenCalledWith("otp:cooldown:+91999");
  });

  it("get returns null when redis.get returns null", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
    };
    const store = createRedisCooldownStore(redis as never);

    expect(await store.get("missing-key")).toBeNull();
  });

  it("set stores value with TTL in milliseconds", async () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const store = createRedisCooldownStore(redis as never);

    await store.set("otp:cooldown:+91888", 1_700_000_000_000, 60_000);

    expect(redis.set).toHaveBeenCalledWith(
      "otp:cooldown:+91888",
      "1700000000000",
      "PX",
      60_000,
    );
  });
});

describe("getCooldownStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns store when redis is available", () => {
    vi.mocked(redisConfig.getRedisClient).mockReturnValue({
      get: vi.fn(),
      set: vi.fn(),
    } as never);

    expect(getCooldownStore()).not.toBeNull();
  });

  it("returns null when redis is not available", () => {
    vi.mocked(redisConfig.getRedisClient).mockReturnValue(null);

    expect(getCooldownStore()).toBeNull();
  });
});
