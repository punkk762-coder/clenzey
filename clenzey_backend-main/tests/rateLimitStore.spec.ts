import type { Options } from "express-rate-limit";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capturedSendCommands } = vi.hoisted(() => ({
  capturedSendCommands: [] as Array<(...args: string[]) => Promise<unknown>>,
}));

vi.mock("rate-limit-redis", () => ({
  RedisStore: class MockRedisStore {
    sendCommand: (...args: string[]) => Promise<unknown>;

    constructor(options: { sendCommand: (...args: string[]) => Promise<unknown> }) {
      capturedSendCommands.push(options.sendCommand);
      this.sendCommand = options.sendCommand;
    }
  },
}));

vi.mock("../src/configs/redisConfig.ts", () => ({
  getRedisClient: vi.fn(),
  isRedisConfigured: vi.fn(),
}));

import * as redisConfig from "../src/configs/redisConfig.ts";
import { withRedisStore } from "../src/middlewares/rateLimitStore.ts";

describe("withRedisStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    capturedSendCommands.length = 0;
  });

  it("returns options unchanged when redis is not configured", () => {
    vi.mocked(redisConfig.isRedisConfigured).mockReturnValue(false);

    const options: Partial<Options> = { windowMs: 60_000, max: 100 };
    expect(withRedisStore(options)).toBe(options);
    expect(redisConfig.getRedisClient).not.toHaveBeenCalled();
  });

  it("returns options unchanged when redis client is unavailable", () => {
    vi.mocked(redisConfig.isRedisConfigured).mockReturnValue(true);
    vi.mocked(redisConfig.getRedisClient).mockReturnValue(null);

    const options: Partial<Options> = { windowMs: 60_000 };
    expect(withRedisStore(options)).toBe(options);
  });

  it("returns RedisStore when redis is available", async () => {
    const mockCall = vi.fn().mockResolvedValue("OK");
    vi.mocked(redisConfig.isRedisConfigured).mockReturnValue(true);
    vi.mocked(redisConfig.getRedisClient).mockReturnValue({
      call: mockCall,
    } as never);

    const options: Partial<Options> = { windowMs: 60_000, max: 50 };
    const result = withRedisStore(options);

    expect(result).not.toBe(options);
    expect(result.windowMs).toBe(60_000);
    expect(result.max).toBe(50);
    expect(result.store).toBeDefined();

    const sendCommand = capturedSendCommands.at(-1)!;
    await sendCommand("GET", "rl:test-key");
    expect(mockCall).toHaveBeenCalledWith("GET", "rl:test-key");
  });
});
