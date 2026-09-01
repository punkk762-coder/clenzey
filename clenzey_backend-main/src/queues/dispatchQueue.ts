import { Queue, type ConnectionOptions } from "bullmq";

import { dispatchConfig } from "../configs/dispatchConfig.ts";
import logger from "../configs/loggerConfig.ts";
import { envConfig } from "../configs/environmentConfig.ts";
import { isRedisConfigured } from "../configs/redisConfig.ts";

export const DISPATCH_QUEUE_NAMES = {
  ESCALATE: "dispatch-escalate",
  INSTANT: "dispatch-instant",
  REDISPATCH: "dispatch-redispatch",
  REVALIDATE: "dispatch-revalidate",
  SCHEDULED_ASSIGN: "dispatch-scheduled-assign",
  SCHEDULED_BATCH: "dispatch-scheduled-batch",
} as const;

export type InstantDispatchJob = {
  bookingId: string;
  firstDispatchAt?: string;
  radiusMeters?: number;
};

export type RedispatchJob = {
  bookingId: string;
  firstDispatchAt: string;
  radiusMeters: number;
};

export type ScheduledAssignJob = {
  bookingId: string;
  mode?: "SCHEDULED_BATCH" | "SCHEDULED_REVALIDATE";
};

export type RevalidateJob = {
  bookingId: string;
};

export type EscalateJob = {
  bookingId: string;
};

/** BullMQ custom job IDs must not contain ":" (reserved delimiter). */
export const dispatchJobId = (...parts: string[]): string => parts.join("_");

let connection: ConnectionOptions | null = null;
const queues = new Map<string, Queue>();

const getConnection = (): ConnectionOptions | null => {
  if (!isRedisConfigured()) return null;
  if (!connection) {
    connection = { url: envConfig.REDIS_URL! };
  }
  return connection;
};

export const getDispatchQueue = (name: string): Queue | null => {
  const conn = getConnection();
  if (!conn) return null;

  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { delay: 2000, type: "exponential" },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    queues.set(name, queue);
  }
  return queue;
};

const addJob = async <T>(
  queueName: string,
  jobName: string,
  data: T,
  opts?: { delay?: number; jobId?: string },
): Promise<boolean> => {
  const queue = getDispatchQueue(queueName);
  if (!queue) {
    logger.warn("Redis unavailable — dispatch job not enqueued", {
      jobName,
      queueName,
    });
    return false;
  }

  await queue.add(jobName, data, {
    ...(opts?.delay !== undefined ? { delay: opts.delay } : {}),
    ...(opts?.jobId !== undefined ? { jobId: opts.jobId } : {}),
  });
  return true;
};

export const enqueueInstantDispatch = async (
  bookingId: string,
): Promise<boolean> =>
  addJob(
    DISPATCH_QUEUE_NAMES.INSTANT,
    "instant",
    { bookingId },
    { jobId: dispatchJobId("instant", bookingId) },
  );

export const enqueueRedispatch = async (
  job: RedispatchJob,
): Promise<boolean> =>
  addJob(DISPATCH_QUEUE_NAMES.REDISPATCH, "redispatch", job, {
    delay: dispatchConfig.redispatchIntervalSec * 1000,
    jobId: dispatchJobId("redispatch", job.bookingId, String(job.radiusMeters)),
  });

export const enqueueEscalate = async (
  bookingId: string,
  delayMs: number,
): Promise<boolean> =>
  addJob(
    DISPATCH_QUEUE_NAMES.ESCALATE,
    "escalate",
    { bookingId },
    {
      delay: delayMs,
      jobId: dispatchJobId("escalate", bookingId),
    },
  );

export const enqueueScheduledAssign = async (
  bookingId: string,
  mode: "SCHEDULED_BATCH" | "SCHEDULED_REVALIDATE" = "SCHEDULED_BATCH",
): Promise<boolean> =>
  addJob(
    DISPATCH_QUEUE_NAMES.SCHEDULED_ASSIGN,
    "scheduled-assign",
    { bookingId, mode },
    { jobId: dispatchJobId("scheduled", bookingId, mode) },
  );

export const enqueueRevalidate = async (
  bookingId: string,
): Promise<boolean> =>
  addJob(
    DISPATCH_QUEUE_NAMES.REVALIDATE,
    "revalidate",
    { bookingId },
    { jobId: dispatchJobId("revalidate", bookingId) },
  );

export const enqueueScheduledBatch = async (): Promise<boolean> =>
  addJob(
    DISPATCH_QUEUE_NAMES.SCHEDULED_BATCH,
    "scheduled-batch",
    {},
    { jobId: dispatchJobId("scheduled-batch", String(Date.now())) },
  );

export const closeDispatchQueues = async (): Promise<void> => {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
  connection = null;
};
