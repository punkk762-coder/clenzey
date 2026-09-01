import type { Job } from "bullmq";

import { dispatchConfig } from "../configs/dispatchConfig.ts";
import { isRedisConfigured } from "../configs/redisConfig.ts";
import {
  DISPATCH_QUEUE_NAMES,
  type InstantDispatchJob,
  type RedispatchJob,
  type RevalidateJob,
  type ScheduledAssignJob,
  dispatchJobId,
  getDispatchQueue,
} from "./dispatchQueue.ts";

export type DispatchQueueName =
  (typeof DISPATCH_QUEUE_NAMES)[keyof typeof DISPATCH_QUEUE_NAMES];

export type FailedDispatchJobDto = {
  attemptsMade: number;
  bookingId: string | null;
  failedReason: string | null;
  finishedOn: string | null;
  id: string;
  name: string;
  payload: Record<string, unknown>;
  queue: string;
  timestamp: string | null;
};

export type EnqueueDispatchResult = {
  jobId: string;
  queue: string;
};

const ALL_QUEUE_NAMES = Object.values(DISPATCH_QUEUE_NAMES);

export const isDispatchQueueName = (
  name: string,
): name is DispatchQueueName =>
  (ALL_QUEUE_NAMES as string[]).includes(name);

export const assertDispatchQueueAvailable = (): void => {
  if (!isRedisConfigured()) {
    throw new DispatchQueueUnavailableError();
  }
};

export class DispatchQueueUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(
    message = "Dispatch queue unavailable; configure REDIS_URL and ensure the worker is running.",
  ) {
    super(message);
    this.name = "DispatchQueueUnavailableError";
  }
}

const adminJobId = (
  prefix: string,
  adminId: string,
  bookingId?: string,
): string => {
  const suffix = `${adminId.slice(0, 8)}_${Date.now()}`;
  return bookingId
    ? dispatchJobId(prefix, bookingId, "admin", suffix)
    : dispatchJobId(prefix, "admin", suffix);
};

const addAdminJob = async <T>(
  queueName: DispatchQueueName,
  jobName: string,
  data: T,
  jobId: string,
): Promise<EnqueueDispatchResult> => {
  assertDispatchQueueAvailable();
  const queue = getDispatchQueue(queueName);
  if (!queue) {
    throw new DispatchQueueUnavailableError();
  }

  const job = await queue.add(jobName, data, { jobId });
  return { jobId: job.id!, queue: queueName };
};

const toFailedJobDto = (job: Job, queue: string): FailedDispatchJobDto => {
  const data = (job.data ?? {}) as Record<string, unknown>;
  const bookingId =
    typeof data["bookingId"] === "string" ? data["bookingId"] : null;

  return {
    attemptsMade: job.attemptsMade,
    bookingId,
    failedReason: job.failedReason ?? null,
    finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    id: job.id!,
    name: job.name,
    payload: data,
    queue,
    timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
  };
};

export const getFailedDispatchJobs = async (opts: {
  limit?: number;
  offset?: number;
  queue?: string;
}): Promise<{ jobs: FailedDispatchJobDto[]; total: number }> => {
  assertDispatchQueueAvailable();

  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const queueNames = opts.queue
    ? isDispatchQueueName(opts.queue)
      ? [opts.queue]
      : []
    : ALL_QUEUE_NAMES;

  if (queueNames.length === 0) {
    return { jobs: [], total: 0 };
  }

  let total = 0;
  const allJobs: FailedDispatchJobDto[] = [];

  for (const queueName of queueNames) {
    const queue = getDispatchQueue(queueName);
    if (!queue) continue;

    const counts = await queue.getJobCounts("failed");
    total += counts.failed ?? 0;

    const failed = await queue.getJobs(["failed"], 0, Math.max(limit + offset, 50));
    allJobs.push(...failed.map((job) => toFailedJobDto(job, queueName)));
  }

  allJobs.sort((a, b) => {
    const aTime = a.finishedOn ? Date.parse(a.finishedOn) : 0;
    const bTime = b.finishedOn ? Date.parse(b.finishedOn) : 0;
    return bTime - aTime;
  });

  return {
    jobs: allJobs.slice(offset, offset + limit),
    total,
  };
};

export const retryFailedDispatchJob = async (
  queueName: string,
  jobId: string,
): Promise<FailedDispatchJobDto> => {
  assertDispatchQueueAvailable();

  if (!isDispatchQueueName(queueName)) {
    throw new Error(`Unknown dispatch queue: ${queueName}`);
  }

  const queue = getDispatchQueue(queueName);
  if (!queue) {
    throw new DispatchQueueUnavailableError();
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }

  const state = await job.getState();
  if (state !== "failed") {
    throw new Error(`Job ${jobId} is not in failed state (current: ${state})`);
  }

  await job.retry();
  const updated = await queue.getJob(jobId);
  if (!updated) {
    throw new Error(`Job ${jobId} not found after retry`);
  }

  return toFailedJobDto(updated, queueName);
};

export const enqueueAdminInstantDispatch = async (
  bookingId: string,
  adminId: string,
): Promise<EnqueueDispatchResult> => {
  const data: InstantDispatchJob = { bookingId };
  return addAdminJob(
    DISPATCH_QUEUE_NAMES.INSTANT,
    "instant",
    data,
    adminJobId("instant", adminId, bookingId),
  );
};

export const enqueueAdminRedispatch = async (
  bookingId: string,
  adminId: string,
  radiusMeters?: number,
): Promise<EnqueueDispatchResult> => {
  const data: RedispatchJob = {
    bookingId,
    firstDispatchAt: new Date().toISOString(),
    radiusMeters: radiusMeters ?? dispatchConfig.initialRadiusM,
  };
  return addAdminJob(
    DISPATCH_QUEUE_NAMES.REDISPATCH,
    "redispatch",
    data,
    adminJobId("redispatch", adminId, bookingId),
  );
};

export const enqueueAdminScheduledAssign = async (
  bookingId: string,
  adminId: string,
  mode: "SCHEDULED_BATCH" | "SCHEDULED_REVALIDATE" = "SCHEDULED_BATCH",
): Promise<EnqueueDispatchResult> => {
  const data: ScheduledAssignJob = { bookingId, mode };
  return addAdminJob(
    DISPATCH_QUEUE_NAMES.SCHEDULED_ASSIGN,
    "scheduled-assign",
    data,
    adminJobId("scheduled", adminId, bookingId),
  );
};

export const enqueueAdminRevalidate = async (
  bookingId: string,
  adminId: string,
): Promise<EnqueueDispatchResult> => {
  const data: RevalidateJob = { bookingId };
  return addAdminJob(
    DISPATCH_QUEUE_NAMES.REVALIDATE,
    "revalidate",
    data,
    adminJobId("revalidate", adminId, bookingId),
  );
};

export const enqueueAdminScheduledBatch = async (
  adminId: string,
): Promise<EnqueueDispatchResult> => {
  return addAdminJob(
    DISPATCH_QUEUE_NAMES.SCHEDULED_BATCH,
    "scheduled-batch",
    {},
    adminJobId("scheduled-batch", adminId),
  );
};
