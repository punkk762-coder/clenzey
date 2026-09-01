import type { Job } from "bullmq";

import { dispatchConfig } from "../configs/dispatchConfig.ts";
import logger from "../configs/loggerConfig.ts";
import {
  expandRadius,
  escalateToAdmin,
  findBookingsDueForRevalidation,
  findUnassignedScheduledBookings,
  processInstantDispatch,
  processScheduledAssign,
  revalidateScheduledBooking,
} from "../api/v1/bookings/dispatchService.ts";
import * as bookingsRepo from "../api/v1/bookings/repository.ts";
import {
  type EscalateJob,
  type InstantDispatchJob,
  type RedispatchJob,
  type RevalidateJob,
  type ScheduledAssignJob,
  enqueueRedispatch,
  enqueueRevalidate,
  enqueueScheduledAssign,
} from "../queues/dispatchQueue.ts";
import { APP_TIMEZONE, istLocalToDate } from "../utilities/timezoneUtils.ts";

export const handleInstantDispatch = async (job: Job<InstantDispatchJob>) => {
  const { bookingId, firstDispatchAt, radiusMeters } = job.data;
  const result = await processInstantDispatch(bookingId, radiusMeters);

  if (result.status === "ASSIGNED" || result.status === "SKIPPED") {
    return result;
  }

  if (result.status === "ESCALATED") {
    return result;
  }

  const nextRadius = expandRadius(result.radiusMeters);
  const startedAt = firstDispatchAt ?? new Date().toISOString();

  if (!result.maxRadiusReached) {
    await enqueueRedispatch({
      bookingId,
      firstDispatchAt: startedAt,
      radiusMeters: nextRadius,
    });
  } else if (!result.escalated) {
    await enqueueRedispatch({
      bookingId,
      firstDispatchAt: startedAt,
      radiusMeters: result.radiusMeters,
    });
  }

  return result;
};

export const handleRedispatch = async (job: Job<RedispatchJob>) => {
  const { bookingId, firstDispatchAt, radiusMeters } = job.data;
  const result = await processInstantDispatch(bookingId, radiusMeters);

  if (result.status === "ASSIGNED" || result.status === "SKIPPED") {
    return result;
  }

  if (result.status === "ESCALATED" || result.status === "NO_CANDIDATES") {
    return result;
  }

  const nextRadius = expandRadius(radiusMeters);
  if (nextRadius > radiusMeters) {
    await enqueueRedispatch({
      bookingId,
      firstDispatchAt,
      radiusMeters: nextRadius,
    });
  }

  return result;
};

export const handleEscalate = async (job: Job<EscalateJob>) => {
  const booking = await bookingsRepo.findBookingById(job.data.bookingId);
  if (
    !booking ||
    booking.partnerId ||
    booking.status !== "CONFIRMED" ||
    booking.bookingType !== "INSTANT"
  ) {
    return { status: "SKIPPED" as const };
  }

  const escalated = await escalateToAdmin(booking.id, booking);
  return escalated
    ? { status: "ESCALATED" as const }
    : { status: "SKIPPED" as const };
};

export const handleScheduledAssign = async (job: Job<ScheduledAssignJob>) => {
  return await processScheduledAssign(
    job.data.bookingId,
    job.data.mode ?? "SCHEDULED_BATCH",
  );
};

export const handleRevalidate = async (job: Job<RevalidateJob>) => {
  return await revalidateScheduledBooking(job.data.bookingId);
};

const getTomorrowIstWindow = (): { end: Date; start: Date } => {
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: APP_TIMEZONE }),
  );
  const tomorrow = new Date(istNow);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const start = istLocalToDate({
    day: tomorrow.getDate(),
    hour: 0,
    minute: 0,
    month: tomorrow.getMonth() + 1,
    year: tomorrow.getFullYear(),
  });

  const end = istLocalToDate({
    day: tomorrow.getDate(),
    hour: 23,
    minute: 59,
    month: tomorrow.getMonth() + 1,
    year: tomorrow.getFullYear(),
  });

  end.setMinutes(end.getMinutes() + 1);
  return { end, start };
};

const getCatchupWindow = (): { end: Date; start: Date } => {
  const now = new Date();
  const end = new Date(
    now.getTime() + dispatchConfig.scheduledCatchupHours * 60 * 60 * 1000,
  );
  return { end, start: now };
};

export const runScheduledBatch = async () => {
  logger.info("Running scheduled dispatch batch");

  const tomorrow = getTomorrowIstWindow();
  const catchup = getCatchupWindow();

  const [tomorrowIds, catchupIds] = await Promise.all([
    findUnassignedScheduledBookings(tomorrow.start, tomorrow.end),
    findUnassignedScheduledBookings(catchup.start, catchup.end),
  ]);

  const bookingIds = [...new Set([...tomorrowIds, ...catchupIds])];

  for (const bookingId of bookingIds) {
    await enqueueScheduledAssign(bookingId, "SCHEDULED_BATCH");
  }

  logger.info("Scheduled dispatch batch enqueued assignments", {
    count: bookingIds.length,
  });

  return { enqueuedCount: bookingIds.length };
};

export const runRevalidateScan = async () => {
  const bookingIds = await findBookingsDueForRevalidation(
    dispatchConfig.revalidateLeadMin,
  );

  for (const bookingId of bookingIds) {
    await enqueueRevalidate(bookingId);
  }

  return { enqueuedCount: bookingIds.length };
};
