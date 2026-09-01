import { Worker, type ConnectionOptions } from "bullmq";
import { CronJob } from "cron";

import { dispatchConfig } from "../configs/dispatchConfig.ts";
import { envConfig } from "../configs/environmentConfig.ts";
import logger from "../configs/loggerConfig.ts";
import { isRedisConfigured } from "../configs/redisConfig.ts";
import { pool } from "../db/index.ts";
import {
  DISPATCH_QUEUE_NAMES,
  enqueueScheduledBatch,
} from "../queues/dispatchQueue.ts";
import { APP_TIMEZONE } from "../utilities/timezoneUtils.ts";
import { waitForDependencies } from "../utilities/waitForDependencies.ts";
import {
  handleEscalate,
  handleInstantDispatch,
  handleRedispatch,
  handleRevalidate,
  handleScheduledAssign,
  runRevalidateScan,
  runScheduledBatch,
} from "./dispatchHandlers.ts";
import { runPayrollIfDue } from "./payrollHandlers.ts";
import { sweepStaleOnlinePartners } from "../api/v1/partners/operationalStatus.ts";

let workers: Worker[] = [];
let scheduledCron: CronJob | null = null;
let revalidateCron: CronJob | null = null;
let payrollCron: CronJob | null = null;
let staleOnlineCron: CronJob | null = null;

const getConnection = (): ConnectionOptions => ({
  url: envConfig.REDIS_URL!,
});

export const startDispatchWorkers = (): void => {
  if (!isRedisConfigured()) {
    logger.warn("REDIS_URL not configured — dispatch workers not started");
    return;
  }

  const connection = getConnection();

  workers = [
    new Worker(DISPATCH_QUEUE_NAMES.INSTANT, handleInstantDispatch, {
      concurrency: 10,
      connection,
    }),
    new Worker(DISPATCH_QUEUE_NAMES.REDISPATCH, handleRedispatch, {
      concurrency: 10,
      connection,
    }),
    new Worker(DISPATCH_QUEUE_NAMES.ESCALATE, handleEscalate, {
      concurrency: 5,
      connection,
    }),
    new Worker(DISPATCH_QUEUE_NAMES.SCHEDULED_ASSIGN, handleScheduledAssign, {
      concurrency: 10,
      connection,
    }),
    new Worker(DISPATCH_QUEUE_NAMES.REVALIDATE, handleRevalidate, {
      concurrency: 10,
      connection,
    }),
    new Worker(DISPATCH_QUEUE_NAMES.SCHEDULED_BATCH, async () => {
      await runScheduledBatch();
    }, {
      concurrency: 1,
      connection,
    }),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, err) => {
      logger.error("Dispatch worker job failed", {
        error: err.message,
        jobId: job?.id,
        queue: worker.name,
      });
    });
  }

  scheduledCron = CronJob.from({
    cronTime: dispatchConfig.scheduledDispatchCron,
    onTick: () => {
      void enqueueScheduledBatch();
    },
    start: true,
    timeZone: APP_TIMEZONE,
  });

  revalidateCron = CronJob.from({
    cronTime: "*/5 * * * *",
    onTick: () => {
      void runRevalidateScan();
    },
    start: true,
    timeZone: APP_TIMEZONE,
  });

  payrollCron = CronJob.from({
    cronTime: envConfig.PAYROLL_CRON,
    onTick: () => {
      void runPayrollIfDue();
    },
    start: true,
    timeZone: APP_TIMEZONE,
  });

  staleOnlineCron = CronJob.from({
    cronTime: "* * * * *",
    onTick: () => {
      void sweepStaleOnlinePartners().catch((err: Error) => {
        logger.error("Stale online partner sweep failed", { error: err.message });
      });
    },
    start: true,
    timeZone: APP_TIMEZONE,
  });

  logger.info("Dispatch workers started", {
    cron: dispatchConfig.scheduledDispatchCron,
    payrollCron: envConfig.PAYROLL_CRON,
    timezone: APP_TIMEZONE,
  });
};

export const stopDispatchWorkers = async (): Promise<void> => {
  scheduledCron?.stop();
  revalidateCron?.stop();
  payrollCron?.stop();
  staleOnlineCron?.stop();
  scheduledCron = null;
  revalidateCron = null;
  payrollCron = null;
  staleOnlineCron = null;

  await Promise.all(workers.map((w) => w.close()));
  workers = [];
};

const main = async () => {
  await waitForDependencies();

  startDispatchWorkers();

  const shutdown = async (signal: string) => {
    logger.info(`Worker received ${signal}, shutting down`);
    await stopDispatchWorkers();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
};

main().catch((err: Error) => {
  logger.error("Worker failed to start", { error: err.message });
  process.exit(1);
});
