import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/configs/loggerConfig.ts", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
  },
}));

const { mockQueueAdd, mockQueueClose } = vi.hoisted(() => ({
  mockQueueAdd: vi.fn().mockResolvedValue(undefined),
  mockQueueClose: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = mockQueueAdd;
    close = mockQueueClose;
  },
}));

import * as redisConfig from "../src/configs/redisConfig.ts";
import {
  closeDispatchQueues,
  DISPATCH_QUEUE_NAMES,
  dispatchJobId,
  enqueueEscalate,
  enqueueInstantDispatch,
  enqueueRedispatch,
  enqueueRevalidate,
  enqueueScheduledAssign,
  enqueueScheduledBatch,
} from "../src/queues/dispatchQueue.ts";

describe("DISPATCH_QUEUE_NAMES", () => {
  it("defines stable queue names for all dispatch job types", () => {
    expect(DISPATCH_QUEUE_NAMES).toEqual({
      ESCALATE: "dispatch-escalate",
      INSTANT: "dispatch-instant",
      REDISPATCH: "dispatch-redispatch",
      REVALIDATE: "dispatch-revalidate",
      SCHEDULED_ASSIGN: "dispatch-scheduled-assign",
      SCHEDULED_BATCH: "dispatch-scheduled-batch",
    });
  });
});

describe("dispatchJobId", () => {
  it("joins parts with underscores instead of colons", () => {
    expect(dispatchJobId("instant", "booking-1")).toBe("instant_booking-1");
    expect(dispatchJobId("redispatch", "booking-1", "5000")).toBe(
      "redispatch_booking-1_5000",
    );
    expect(dispatchJobId("instant", "booking-1")).not.toContain(":");
  });
});

describe("dispatch queue without Redis", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await closeDispatchQueues();
  });

  it("returns false from enqueueInstantDispatch when Redis is unavailable", async () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(false);

    await expect(enqueueInstantDispatch("booking-1")).resolves.toBe(false);
  });

  it("returns false from other enqueue helpers when Redis is unavailable", async () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(false);

    await expect(
      enqueueRedispatch({
        bookingId: "booking-1",
        firstDispatchAt: "2026-07-12T10:00:00.000Z",
        radiusMeters: 5000,
      }),
    ).resolves.toBe(false);
    await expect(enqueueRevalidate("booking-1")).resolves.toBe(false);
    await expect(enqueueScheduledAssign("booking-1")).resolves.toBe(false);
  });

  it("closeDispatchQueues clears internal state safely", async () => {
    await expect(closeDispatchQueues()).resolves.toBeUndefined();
  });
});

describe("dispatch queue with Redis", () => {
  beforeEach(() => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    mockQueueAdd.mockClear();
    mockQueueClose.mockClear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await closeDispatchQueues();
  });

  it("returns true from enqueueInstantDispatch when Queue.add succeeds", async () => {
    await expect(enqueueInstantDispatch("booking-1")).resolves.toBe(true);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "instant",
      { bookingId: "booking-1" },
      expect.objectContaining({ jobId: "instant_booking-1" }),
    );
  });

  it("returns true from enqueueEscalate with delay", async () => {
    await expect(enqueueEscalate("booking-2", 5000)).resolves.toBe(true);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "escalate",
      { bookingId: "booking-2" },
      expect.objectContaining({
        delay: 5000,
        jobId: "escalate_booking-2",
      }),
    );
  });

  it("returns true from enqueueScheduledBatch", async () => {
    await expect(enqueueScheduledBatch()).resolves.toBe(true);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "scheduled-batch",
      {},
      expect.objectContaining({
        jobId: expect.stringMatching(/^scheduled-batch_\d+$/),
      }),
    );
  });
});
