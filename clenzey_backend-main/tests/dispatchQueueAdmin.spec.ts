import { afterEach, describe, expect, it, vi } from "vitest";

import * as redisConfig from "../src/configs/redisConfig.ts";
import * as dispatchQueue from "../src/queues/dispatchQueue.ts";
import { DISPATCH_QUEUE_NAMES } from "../src/queues/dispatchQueue.ts";
import {
  assertDispatchQueueAvailable,
  DispatchQueueUnavailableError,
  enqueueAdminInstantDispatch,
  enqueueAdminRedispatch,
  enqueueAdminRevalidate,
  enqueueAdminScheduledAssign,
  enqueueAdminScheduledBatch,
  getFailedDispatchJobs,
  isDispatchQueueName,
  retryFailedDispatchJob,
} from "../src/queues/dispatchQueueAdmin.ts";

describe("DispatchQueueUnavailableError", () => {
  it("exposes a 503 status code and default message", () => {
    const error = new DispatchQueueUnavailableError();
    expect(error.name).toBe("DispatchQueueUnavailableError");
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain("Dispatch queue unavailable");
  });

  it("accepts a custom message", () => {
    const error = new DispatchQueueUnavailableError("Redis is down");
    expect(error.message).toBe("Redis is down");
  });
});

describe("assertDispatchQueueAvailable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws DispatchQueueUnavailableError when Redis is unavailable", () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(false);

    expect(() => assertDispatchQueueAvailable()).toThrow(
      DispatchQueueUnavailableError,
    );
  });
});

describe("isDispatchQueueName", () => {
  it("accepts all known dispatch queue names", () => {
    for (const name of Object.values(DISPATCH_QUEUE_NAMES)) {
      expect(isDispatchQueueName(name)).toBe(true);
    }
  });

  it("rejects unknown queue names", () => {
    expect(isDispatchQueueName("unknown-queue")).toBe(false);
    expect(isDispatchQueueName("")).toBe(false);
  });
});

const makeQueue = () => ({
  add: vi.fn().mockResolvedValue({ id: "job-1" }),
  getJob: vi.fn(),
  getJobCounts: vi.fn().mockResolvedValue({ failed: 1 }),
  getJobs: vi.fn().mockResolvedValue([
    {
      attemptsMade: 2,
      data: { bookingId: "booking-1" },
      failedReason: "timeout",
      finishedOn: Date.parse("2026-07-12T10:00:00.000Z"),
      id: "job-1",
      name: "instant",
      timestamp: Date.parse("2026-07-12T09:59:00.000Z"),
    },
  ]),
});

describe("dispatch queue admin with mocked Redis", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enqueues admin instant dispatch jobs", async () => {
    const queue = makeQueue();
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    const result = await enqueueAdminInstantDispatch("booking-1", "admin-1");

    expect(result.queue).toBe(DISPATCH_QUEUE_NAMES.INSTANT);
    expect(result.jobId).toBe("job-1");
    expect(queue.add).toHaveBeenCalledWith(
      "instant",
      { bookingId: "booking-1" },
      expect.objectContaining({ jobId: expect.stringContaining("instant") }),
    );
  });

  it("lists failed dispatch jobs across queues", async () => {
    const queue = makeQueue();
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    const result = await getFailedDispatchJobs({ limit: 10 });

    expect(result.total).toBe(Object.keys(DISPATCH_QUEUE_NAMES).length);
    expect(result.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookingId: "booking-1",
          failedReason: "timeout",
        }),
      ]),
    );
  });

  it("returns empty results for unknown queue filters", async () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);

    const result = await getFailedDispatchJobs({ queue: "unknown-queue" });
    expect(result).toEqual({ jobs: [], total: 0 });
  });

  it("retries a failed job and returns the updated DTO", async () => {
    const updatedJob = {
      attemptsMade: 0,
      data: { bookingId: "booking-1" },
      failedReason: null,
      finishedOn: null,
      id: "job-1",
      name: "instant",
      timestamp: Date.parse("2026-07-12T09:59:00.000Z"),
    };
    const queue = {
      ...makeQueue(),
      getJob: vi
        .fn()
        .mockResolvedValueOnce({
          getState: vi.fn().mockResolvedValue("failed"),
          retry: vi.fn().mockResolvedValue(undefined),
        })
        .mockResolvedValueOnce(updatedJob),
    };
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    const result = await retryFailedDispatchJob(
      DISPATCH_QUEUE_NAMES.INSTANT,
      "job-1",
    );

    expect(result.id).toBe("job-1");
    expect(result.bookingId).toBe("booking-1");
  });

  it("throws when retrying an unknown queue", async () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);

    await expect(
      retryFailedDispatchJob("unknown-queue", "job-1"),
    ).rejects.toThrow("Unknown dispatch queue");
  });

  it("enqueues admin redispatch, scheduled assign, revalidate, and batch jobs", async () => {
    const queue = makeQueue();
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    const redispatch = await enqueueAdminRedispatch("booking-2", "admin-1", 7000);
    const scheduled = await enqueueAdminScheduledAssign(
      "booking-3",
      "admin-1",
      "SCHEDULED_REVALIDATE",
    );
    const revalidate = await enqueueAdminRevalidate("booking-4", "admin-1");
    const batch = await enqueueAdminScheduledBatch("admin-1");

    expect(redispatch.queue).toBe(DISPATCH_QUEUE_NAMES.REDISPATCH);
    expect(scheduled.queue).toBe(DISPATCH_QUEUE_NAMES.SCHEDULED_ASSIGN);
    expect(revalidate.queue).toBe(DISPATCH_QUEUE_NAMES.REVALIDATE);
    expect(batch.queue).toBe(DISPATCH_QUEUE_NAMES.SCHEDULED_BATCH);
    expect(queue.add).toHaveBeenCalledTimes(4);
  });

  it("filters failed jobs to a specific queue name", async () => {
    const queue = makeQueue();
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    const result = await getFailedDispatchJobs({
      limit: 5,
      queue: DISPATCH_QUEUE_NAMES.INSTANT,
    });

    expect(result.total).toBe(1);
    expect(result.jobs).toHaveLength(1);
  });

  it("throws when retrying a missing job", async () => {
    const queue = {
      ...makeQueue(),
      getJob: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    await expect(
      retryFailedDispatchJob(DISPATCH_QUEUE_NAMES.INSTANT, "missing-job"),
    ).rejects.toThrow("Job missing-job not found");
  });

  it("throws when retrying a job that is not failed", async () => {
    const queue = {
      ...makeQueue(),
      getJob: vi.fn().mockResolvedValue({
        getState: vi.fn().mockResolvedValue("completed"),
        retry: vi.fn(),
      }),
    };
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(queue as never);

    await expect(
      retryFailedDispatchJob(DISPATCH_QUEUE_NAMES.INSTANT, "job-1"),
    ).rejects.toThrow("not in failed state");
  });

  it("does not throw when redis is configured for assertDispatchQueueAvailable", () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    expect(() => assertDispatchQueueAvailable()).not.toThrow();
  });

  it("throws when queue client is unavailable during admin enqueue", async () => {
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);
    vi.spyOn(dispatchQueue, "getDispatchQueue").mockReturnValue(null);

    await expect(enqueueAdminInstantDispatch("booking-x", "admin-1")).rejects.toThrow(
      DispatchQueueUnavailableError,
    );
  });
});
