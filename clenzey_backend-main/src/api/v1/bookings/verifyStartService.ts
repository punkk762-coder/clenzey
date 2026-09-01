import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { bookingEvents } from "../../../realtime/bookingEvents.ts";
import * as photosService from "../photos/service.ts";
import { codesMatch } from "./checkInCode.ts";
import * as repo from "./repository.ts";
import {
  assertVerifyStartAllowed,
  clearBookingVerifyLock,
  lockBookingAfterFailedAttempts,
} from "./verifyStartRateLimit.ts";
import { emitPartnerOperationalStatus } from "../partners/operationalStatus.ts";
import * as locationStream from "./locationStream.ts";

export type VerifyStartInput = {
  bookingId: string;
  code: string;
  partnerId: string;
};

/**
 * Partner verifies the consumer's 4-digit code and starts the job
 * (PROFESSIONAL_EN_ROUTE → IN_PROGRESS).
 */
export const verifyAndStartJob = async (input: VerifyStartInput) => {
  const booking = await repo.findBookingById(input.bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");

  if (!booking.partnerId || booking.partnerId !== input.partnerId) {
    throw new UnauthorizedError("Not assigned to you.");
  }

  if (booking.status !== "PROFESSIONAL_EN_ROUTE") {
    throw new BadRequestError(
      `Cannot verify start from status ${booking.status}. Partner must be en route.`,
    );
  }

  await assertVerifyStartAllowed({
    attempts: booking.checkInCodeAttempts,
    bookingId: booking.id,
    partnerId: input.partnerId,
  });

  if (!codesMatch(booking.checkInCode, input.code)) {
    const attempts = booking.checkInCodeAttempts + 1;
    await repo.updateBooking(booking.id, { checkInCodeAttempts: attempts });
    await lockBookingAfterFailedAttempts(booking.id, attempts);
    await repo.insertStatusHistory({
      actorId: input.partnerId,
      actorType: "PARTNER",
      bookingId: booking.id,
      fromStatus: booking.status,
      metadata: { failedAttempt: true, verifiedViaCode: false },
      reason: "Invalid verification code",
      toStatus: booking.status,
    });
    throw new BadRequestError("Invalid verification code");
  }

  const beforeCount = await photosService.getPhotoCount(booking.id, "BEFORE");
  if (beforeCount < 1) {
    throw new BadRequestError("At least 1 before-photo is required to start work.");
  }

  const now = new Date();
  const updated = await repo.updateBooking(booking.id, {
    checkInCodeAttempts: 0,
    checkInCodeVerifiedAt: now,
    checkedInAt: booking.checkedInAt ?? now,
    startedAt: now,
    status: "IN_PROGRESS",
  });

  await clearBookingVerifyLock(booking.id);

  await repo.insertStatusHistory({
    actorId: input.partnerId,
    actorType: "PARTNER",
    bookingId: booking.id,
    fromStatus: booking.status,
    metadata: { failedAttempt: false, verifiedViaCode: true },
    reason: "Verified via check-in code",
    toStatus: "IN_PROGRESS",
  });

  bookingEvents.emitStatusChanged({
    bookingId: updated.id,
    consumerId: updated.consumerId,
    fromStatus: booking.status,
    partnerId: updated.partnerId,
    timestamp: now.toISOString(),
    toStatus: "IN_PROGRESS",
  });

  locationStream.startStalenessMonitor(updated.id, updated.consumerId);

  void emitPartnerOperationalStatus(input.partnerId);

  return updated;
};
