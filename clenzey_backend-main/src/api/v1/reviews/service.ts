import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import { domainEvents } from "../../../realtime/domainEvents.ts";
import * as incentiveService from "../incentive/service.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import type { ReviewRecord } from "./repository.ts";
import * as repo from "./repository.ts";

export type BookingReviewStatus = {
  canSubmitReview: boolean;
  hasReview: boolean;
  review: {
    createdAt: string;
    id: string;
    rating: number;
    review: null | string;
  } | null;
};

const mapReview = (
  record: ReviewRecord,
): NonNullable<BookingReviewStatus["review"]> => ({
  createdAt: record.createdAt.toISOString(),
  id: record.id,
  rating: record.rating,
  review: record.review,
});

export const buildReviewStatus = (
  booking: { partnerId: null | string; status: string },
  existing: ReviewRecord | null,
  options: { forConsumer: boolean },
): BookingReviewStatus => ({
  canSubmitReview:
    options.forConsumer &&
    booking.status === "COMPLETED" &&
    !!booking.partnerId &&
    !existing,
  hasReview: !!existing,
  review: existing ? mapReview(existing) : null,
});

export const getReviewStatusForBooking = async (
  bookingId: string,
  consumerId: string,
): Promise<BookingReviewStatus> => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  if (booking.consumerId !== consumerId) {
    throw new BadRequestError("This booking does not belong to you.");
  }

  const existing = await repo.findByBookingId(bookingId);
  return buildReviewStatus(booking, existing, { forConsumer: true });
};

export type SubmitReviewInput = {
  bookingId: string;
  consumerId: string;
  rating: number;
  review?: string;
};

export const submitReview = async (input: SubmitReviewInput) => {
  // 1. Validate booking exists, is COMPLETED, and belongs to the consumer
  const booking = await bookingsRepo.findBookingById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  if (booking.consumerId !== input.consumerId) {
    throw new BadRequestError("This booking does not belong to you.");
  }

  if (booking.status !== "COMPLETED") {
    throw new BadRequestError(
      "Reviews can only be submitted for completed bookings.",
    );
  }

  if (!booking.partnerId) {
    throw new BadRequestError(
      "Cannot review a booking without an assigned partner.",
    );
  }

  // 2. Check for duplicate review
  const existing = await repo.findByBookingId(input.bookingId);
  if (existing) {
    throw new ConflictError("A review has already been submitted for this booking.");
  }

  // 3. Insert the review
  const review = await repo.insertReview({
    bookingId: input.bookingId,
    consumerId: input.consumerId,
    partnerId: booking.partnerId,
    rating: input.rating,
    review: input.review ?? null,
  });

  // 4. Recalculate the partner's average rating
  await repo.recalculatePartnerRating(booking.partnerId);

  // 5. Emit review:created event
  domainEvents.emitReviewCreated({
    consumerId: input.consumerId,
    partnerId: booking.partnerId,
    rating: input.rating,
    reviewId: review.id,
    timestamp: new Date().toISOString(),
  });

  // 6. Credit 5-star review incentive
  if (input.rating === 5) {
    const subtotal = parseFloat(booking.subtotal);
    const ledgerEntry = await incentiveService.creditFiveStarIncentive({
      bookingId: booking.id,
      partnerId: booking.partnerId,
      reviewId: review.id,
      serviceId: booking.serviceId,
      subtotal,
    });

    domainEvents.emitIncentiveCredited({
      amount: parseFloat(ledgerEntry.amount),
      bookingId: booking.id,
      ledgerEntryId: ledgerEntry.id,
      partnerId: booking.partnerId,
      reviewId: review.id,
      timestamp: new Date().toISOString(),
    });
  }

  return review;
};

export const getPartnerReviews = async (
  partnerId: string,
  opts: { limit?: number; offset?: number },
) => {
  return await repo.listByPartnerId(partnerId, opts);
};

export const listAdminReviews = async (filters: {
  consumerId?: string;
  consumerName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  partnerId?: string;
  partnerName?: string;
  ratingMax?: number;
  ratingMin?: number;
}) => {
  return await repo.listAdmin(filters);
};
