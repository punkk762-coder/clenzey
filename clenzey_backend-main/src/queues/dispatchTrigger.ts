import logger from "../configs/loggerConfig.ts";
import { dispatchConfig } from "../configs/dispatchConfig.ts";
import * as bookingsRepo from "../api/v1/bookings/repository.ts";
import {
  processInstantDispatch,
  processScheduledAssign,
  publishDispatchSearching,
} from "../api/v1/bookings/dispatchService.ts";
import {
  enqueueEscalate,
  enqueueInstantDispatch,
  enqueueScheduledAssign,
} from "../queues/dispatchQueue.ts";

/**
 * Trigger partner dispatch after a booking reaches CONFIRMED.
 * Uses BullMQ when Redis is available; falls back to synchronous dispatch.
 */
export const triggerDispatchOnConfirmed = async (
  bookingId: string,
): Promise<void> => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking || booking.status !== "CONFIRMED" || booking.partnerId) {
    return;
  }

  if (booking.bookingType === "INSTANT") {
    const enqueued = await enqueueInstantDispatch(bookingId);
    if (!enqueued) {
      logger.warn("Redis unavailable — running synchronous instant dispatch", {
        bookingId,
      });
      await processInstantDispatch(bookingId);
    } else {
      await enqueueEscalate(
        bookingId,
        dispatchConfig.escalationMin * 60_000,
      );
      await publishDispatchSearching(bookingId);
    }
    return;
  }

  if (booking.bookingType === "SCHEDULED" && booking.scheduledAt) {
    const enqueued = await enqueueScheduledAssign(
      bookingId,
      "SCHEDULED_BATCH",
    );
    if (!enqueued) {
      logger.warn(
        "Redis unavailable — running synchronous scheduled assign",
        { bookingId },
      );
      await processScheduledAssign(bookingId, "SCHEDULED_BATCH");
    }
  }
};
