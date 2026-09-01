import { HttpStatusCode } from "axios";

import { dispatchConfig } from "../../../configs/dispatchConfig.ts";
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import {
  DispatchQueueUnavailableError,
  enqueueAdminInstantDispatch,
  enqueueAdminRedispatch,
  enqueueAdminRevalidate,
  enqueueAdminScheduledAssign,
  enqueueAdminScheduledBatch,
  getFailedDispatchJobs,
  retryFailedDispatchJob,
  type EnqueueDispatchResult,
} from "../../../queues/dispatchQueueAdmin.ts";
import {
  handleInstantDispatch,
  handleRedispatch,
  handleRevalidate,
  handleScheduledAssign,
  runScheduledBatch,
} from "../../../workers/dispatchHandlers.ts";
import { listEscalatedBookings } from "../bookings/dispatchService.ts";
import * as repo from "../bookings/repository.ts";
import type { Job } from "bullmq";

export type TriggerDispatchResult = {
  bookingId?: string;
  jobId: string;
  queued: boolean;
  queue: string;
  syncResult?: unknown;
};

const wrapQueueError = (err: unknown): never => {
  if (err instanceof DispatchQueueUnavailableError) {
    throw new AppError(err.message, {
      error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR },
      statusCode: HttpStatusCode.ServiceUnavailable,
    });
  }
  throw err;
};

const recordAdminDispatchAudit = async (params: {
  adminId: string;
  bookingId?: string;
  jobId: string;
  jobType: string;
  queue: string;
}): Promise<void> => {
  if (!params.bookingId) return;

  const booking = await repo.findBookingById(params.bookingId);
  if (!booking) return;

  await repo.insertStatusHistory({
    actorId: params.adminId,
    actorType: "ADMIN",
    bookingId: params.bookingId,
    fromStatus: booking.status,
    metadata: {
      adminId: params.adminId,
      jobId: params.jobId,
      jobType: params.jobType,
      queue: params.queue,
      type: "ADMIN_DISPATCH_TRIGGER",
    },
    reason: `Admin triggered ${params.jobType} dispatch job`,
    toStatus: booking.status,
  });
};

const enqueueOrSync = async (params: {
  adminId: string;
  bookingId?: string;
  enqueue: () => Promise<EnqueueDispatchResult>;
  jobType: string;
  sync?: boolean;
  syncRun: () => Promise<unknown>;
}): Promise<TriggerDispatchResult> => {
  try {
    if (params.sync) {
      const syncResult = await params.syncRun();
      const jobId = `sync_${params.jobType}_${params.bookingId ?? "batch"}_${Date.now()}`;
      await recordAdminDispatchAudit({
        adminId: params.adminId,
        ...(params.bookingId ? { bookingId: params.bookingId } : {}),
        jobId,
        jobType: params.jobType,
        queue: "sync",
      });
      return {
        ...(params.bookingId ? { bookingId: params.bookingId } : {}),
        jobId,
        queued: false,
        queue: "sync",
        syncResult,
      };
    }

    const result = await params.enqueue();
    await recordAdminDispatchAudit({
      adminId: params.adminId,
      ...(params.bookingId ? { bookingId: params.bookingId } : {}),
      jobId: result.jobId,
      jobType: params.jobType,
      queue: result.queue,
    });

    return {
      ...(params.bookingId ? { bookingId: params.bookingId } : {}),
      jobId: result.jobId,
      queued: true,
      queue: result.queue,
    };
  } catch (err) {
    if (!params.sync && err instanceof DispatchQueueUnavailableError) {
      const syncResult = await params.syncRun();
      const jobId = `sync_${params.jobType}_${params.bookingId ?? "batch"}_${Date.now()}`;
      await recordAdminDispatchAudit({
        adminId: params.adminId,
        ...(params.bookingId ? { bookingId: params.bookingId } : {}),
        jobId,
        jobType: params.jobType,
        queue: "sync",
      });
      return {
        ...(params.bookingId ? { bookingId: params.bookingId } : {}),
        jobId,
        queued: false,
        queue: "sync",
        syncResult,
      };
    }
    return wrapQueueError(err);
  }
};

const loadBooking = async (bookingId: string) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");
  return booking;
};

const assertInstantEligible = (booking: Awaited<ReturnType<typeof loadBooking>>) => {
  if (booking.bookingType !== "INSTANT") {
    throw new BadRequestError("Booking must be INSTANT type.");
  }
  if (booking.status !== "CONFIRMED") {
    throw new BadRequestError("Booking must be in CONFIRMED status.");
  }
  if (booking.partnerId) {
    throw new BadRequestError("Booking already has a partner assigned.");
  }
};

const assertScheduledAssignEligible = (
  booking: Awaited<ReturnType<typeof loadBooking>>,
) => {
  if (booking.bookingType !== "SCHEDULED") {
    throw new BadRequestError("Booking must be SCHEDULED type.");
  }
  if (booking.status !== "CONFIRMED") {
    throw new BadRequestError("Booking must be in CONFIRMED status.");
  }
  if (booking.partnerId) {
    throw new BadRequestError("Booking already has a partner assigned.");
  }
};

const assertRevalidateEligible = (
  booking: Awaited<ReturnType<typeof loadBooking>>,
) => {
  if (booking.bookingType !== "SCHEDULED") {
    throw new BadRequestError("Booking must be SCHEDULED type.");
  }
  if (!booking.partnerId) {
    throw new BadRequestError("Booking has no partner to revalidate.");
  }
  if (!["CONFIRMED", "PROFESSIONAL_ASSIGNED"].includes(booking.status)) {
    throw new BadRequestError(
      "Booking must be CONFIRMED or PROFESSIONAL_ASSIGNED.",
    );
  }
};

const mockJob = <T>(data: T, name: string): Job<T> =>
  ({ data, name }) as Job<T>;

export const triggerInstantDispatch = async (
  bookingId: string,
  adminId: string,
  sync = false,
): Promise<TriggerDispatchResult> => {
  const booking = await loadBooking(bookingId);
  assertInstantEligible(booking);

  return enqueueOrSync({
    adminId,
    bookingId,
    enqueue: () => enqueueAdminInstantDispatch(bookingId, adminId),
    jobType: "instant",
    ...(sync ? { sync: true } : {}),
    syncRun: () => handleInstantDispatch(mockJob({ bookingId }, "instant")),
  });
};

export const triggerRedispatch = async (
  bookingId: string,
  adminId: string,
  opts: { radiusMeters?: number; sync?: boolean } = {},
): Promise<TriggerDispatchResult> => {
  const booking = await loadBooking(bookingId);
  assertInstantEligible(booking);

  const radiusMeters = opts.radiusMeters;
  const firstDispatchAt = new Date().toISOString();

  return enqueueOrSync({
    adminId,
    bookingId,
    enqueue: () =>
      enqueueAdminRedispatch(bookingId, adminId, radiusMeters),
    jobType: "redispatch",
    ...(opts.sync ? { sync: true } : {}),
    syncRun: () =>
      handleRedispatch(
        mockJob(
          {
            bookingId,
            firstDispatchAt,
            radiusMeters: radiusMeters ?? dispatchConfig.initialRadiusM,
          },
          "redispatch",
        ),
      ),
  });
};

export const triggerScheduledAssign = async (
  bookingId: string,
  adminId: string,
  sync = false,
): Promise<TriggerDispatchResult> => {
  const booking = await loadBooking(bookingId);
  assertScheduledAssignEligible(booking);

  return enqueueOrSync({
    adminId,
    bookingId,
    enqueue: () => enqueueAdminScheduledAssign(bookingId, adminId),
    jobType: "scheduled-assign",
    ...(sync ? { sync: true } : {}),
    syncRun: () =>
      handleScheduledAssign(
        mockJob({ bookingId, mode: "SCHEDULED_BATCH" }, "scheduled-assign"),
      ),
  });
};

export const triggerRevalidate = async (
  bookingId: string,
  adminId: string,
  sync = false,
): Promise<TriggerDispatchResult> => {
  const booking = await loadBooking(bookingId);
  assertRevalidateEligible(booking);

  return enqueueOrSync({
    adminId,
    bookingId,
    enqueue: () => enqueueAdminRevalidate(bookingId, adminId),
    jobType: "revalidate",
    ...(sync ? { sync: true } : {}),
    syncRun: () =>
      handleRevalidate(mockJob({ bookingId }, "revalidate")),
  });
};

export const triggerScheduledBatch = async (
  adminId: string,
  sync = false,
): Promise<TriggerDispatchResult> => {
  return enqueueOrSync({
    adminId,
    enqueue: () => enqueueAdminScheduledBatch(adminId),
    jobType: "scheduled-batch",
    ...(sync ? { sync: true } : {}),
    syncRun: () => runScheduledBatch(),
  });
};

export const listFailedJobs = async (opts: {
  limit?: number;
  offset?: number;
  queue?: string;
}) => {
  try {
    return await getFailedDispatchJobs(opts);
  } catch (err) {
    return wrapQueueError(err);
  }
};

export const retryFailedJob = async (queueName: string, jobId: string) => {
  try {
    return await retryFailedDispatchJob(queueName, jobId);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      throw new NotFoundError(err.message);
    }
    if (err instanceof Error && err.message.includes("not in failed")) {
      throw new BadRequestError(err.message);
    }
    if (err instanceof Error && err.message.includes("Unknown dispatch queue")) {
      throw new BadRequestError(err.message);
    }
    return wrapQueueError(err);
  }
};

export { listEscalatedBookings };
