import { afterEach, describe, expect, it, vi } from "vitest";

import { memoryCooldownStore } from "../src/stores/memoryCooldownStore.ts";

describe("memoryCooldownStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", async () => {
    await memoryCooldownStore.set("otp:cooldown:+91999", Date.now(), 60_000);
    const value = await memoryCooldownStore.get("otp:cooldown:+91999");
    expect(value).toBeTypeOf("number");
  });

  it("returns null for missing keys", async () => {
    expect(await memoryCooldownStore.get("missing-key")).toBeNull();
  });

  it("expires values after the TTL", async () => {
    vi.useFakeTimers();
    await memoryCooldownStore.set("otp:cooldown:+91888", Date.now(), 1_000);
    expect(await memoryCooldownStore.get("otp:cooldown:+91888")).not.toBeNull();

    vi.advanceTimersByTime(1_001);
    expect(await memoryCooldownStore.get("otp:cooldown:+91888")).toBeNull();
  });
});
