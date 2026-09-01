import { afterEach, describe, expect, it, vi } from "vitest";

import * as bookingsRepo from "../src/api/v1/bookings/repository.ts";
import type { ReviewRecord } from "../src/api/v1/reviews/repository.ts";
import * as repo from "../src/api/v1/reviews/repository.ts";
import { domainEvents } from "../src/realtime/domainEvents.ts";
import * as incentiveService from "../src/api/v1/incentive/service.ts";
import {
  buildReviewStatus,
  getPartnerReviews,
  getReviewStatusForBooking,
  listAdminReviews,
  submitReview,
} from "../src/api/v1/reviews/service.ts";

const makeReview = (overrides: Partial<ReviewRecord> = {}): ReviewRecord =>
  ({
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    id: "review-1",
    rating: 5,
    review: "Great service",
    ...overrides,
  }) as ReviewRecord;

describe("buildReviewStatus", () => {
  it("allows a consumer to submit a review on a completed booking with a partner", () => {
    const status = buildReviewStatus(
      { partnerId: "partner-1", status: "COMPLETED" },
      null,
      { forConsumer: true },
    );

    expect(status.canSubmitReview).toBe(true);
    expect(status.hasReview).toBe(false);
    expect(status.review).toBeNull();
  });

  it("blocks submission when the booking is not completed", () => {
    const status = buildReviewStatus(
      { partnerId: "partner-1", status: "CONFIRMED" },
      null,
      { forConsumer: true },
    );

    expect(status.canSubmitReview).toBe(false);
  });

  it("blocks submission when there is no assigned partner", () => {
    const status = buildReviewStatus(
      { partnerId: null, status: "COMPLETED" },
      null,
      { forConsumer: true },
    );

    expect(status.canSubmitReview).toBe(false);
  });

  it("blocks submission when a review already exists and maps it", () => {
    const status = buildReviewStatus(
      { partnerId: "partner-1", status: "COMPLETED" },
      makeReview(),
      { forConsumer: true },
    );

    expect(status.canSubmitReview).toBe(false);
    expect(status.hasReview).toBe(true);
    expect(status.review).toEqual({
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "review-1",
      rating: 5,
      review: "Great service",
    });
  });

  it("blocks submission when not acting on behalf of the consumer", () => {
    const status = buildReviewStatus(
      { partnerId: "partner-1", status: "COMPLETED" },
      null,
      { forConsumer: false },
    );

    expect(status.canSubmitReview).toBe(false);
  });

  it("maps a null review body without error", () => {
    const status = buildReviewStatus(
      { partnerId: "partner-1", status: "COMPLETED" },
      makeReview({ review: null, rating: 4 }),
      { forConsumer: true },
    );

    expect(status.review?.review).toBeNull();
    expect(status.review?.rating).toBe(4);
  });
});

describe("getReviewStatusForBooking", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws NotFoundError when the booking does not exist", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(null as never);

    await expect(
      getReviewStatusForBooking("booking-1", "consumer-1"),
    ).rejects.toThrow("Booking not found.");
  });

  it("throws when the booking belongs to another consumer", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      consumerId: "other",
      partnerId: "partner-1",
      status: "COMPLETED",
    } as never);

    await expect(
      getReviewStatusForBooking("booking-1", "consumer-1"),
    ).rejects.toThrow("This booking does not belong to you.");
  });

  it("returns a review status for the owning consumer", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "COMPLETED",
    } as never);
    vi.spyOn(repo, "findByBookingId").mockResolvedValue(null as never);

    const status = await getReviewStatusForBooking("booking-1", "consumer-1");
    expect(status.canSubmitReview).toBe(true);
  });
});

describe("submitReview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeBooking = () =>
    ({
      consumerId: "consumer-1",
      id: "booking-1",
      partnerId: "partner-1",
      serviceId: "service-1",
      status: "COMPLETED",
      subtotal: "1000.00",
    }) as never;

  it("throws when the booking does not exist", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(null as never);

    await expect(
      submitReview({
        bookingId: "booking-1",
        consumerId: "consumer-1",
        rating: 5,
      }),
    ).rejects.toThrow("Booking not found.");
  });

  it("rejects reviews from non-owning consumers", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      consumerId: "other",
      partnerId: "partner-1",
      status: "COMPLETED",
    } as never);

    await expect(
      submitReview({
        bookingId: "booking-1",
        consumerId: "consumer-1",
        rating: 5,
      }),
    ).rejects.toThrow("This booking does not belong to you.");
  });

  it("rejects reviews for non-completed bookings", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      consumerId: "consumer-1",
      partnerId: "partner-1",
      status: "CONFIRMED",
    } as never);

    await expect(
      submitReview({
        bookingId: "booking-1",
        consumerId: "consumer-1",
        rating: 5,
      }),
    ).rejects.toThrow("Reviews can only be submitted for completed bookings.");
  });

  it("rejects reviews when no partner is assigned", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue({
      consumerId: "consumer-1",
      partnerId: null,
      status: "COMPLETED",
    } as never);

    await expect(
      submitReview({
        bookingId: "booking-1",
        consumerId: "consumer-1",
        rating: 5,
      }),
    ).rejects.toThrow("Cannot review a booking without an assigned partner.");
  });

  it("rejects duplicate reviews", async () => {
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(makeBooking());
    vi.spyOn(repo, "findByBookingId").mockResolvedValue(makeReview() as never);

    await expect(
      submitReview({
        bookingId: "booking-1",
        consumerId: "consumer-1",
        rating: 5,
      }),
    ).rejects.toThrow("A review has already been submitted for this booking.");
  });

  it("submits a review and recalculates partner rating", async () => {
    const review = makeReview();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(makeBooking());
    vi.spyOn(repo, "findByBookingId").mockResolvedValue(null as never);
    vi.spyOn(repo, "insertReview").mockResolvedValue(review as never);
    const recalcSpy = vi
      .spyOn(repo, "recalculatePartnerRating")
      .mockResolvedValue(undefined as never);
    const emitSpy = vi.spyOn(domainEvents, "emitReviewCreated");

    const result = await submitReview({
      bookingId: "booking-1",
      consumerId: "consumer-1",
      rating: 4,
      review: "Good job",
    });

    expect(result).toBe(review);
    expect(recalcSpy).toHaveBeenCalledWith("partner-1");
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerId: "consumer-1",
        partnerId: "partner-1",
        rating: 4,
        reviewId: "review-1",
      }),
    );
  });

  it("credits a five-star incentive and emits incentive event", async () => {
    const review = makeReview();
    vi.spyOn(bookingsRepo, "findBookingById").mockResolvedValue(makeBooking());
    vi.spyOn(repo, "findByBookingId").mockResolvedValue(null as never);
    vi.spyOn(repo, "insertReview").mockResolvedValue(review as never);
    vi.spyOn(repo, "recalculatePartnerRating").mockResolvedValue(undefined as never);
    vi.spyOn(incentiveService, "creditFiveStarIncentive").mockResolvedValue({
      amount: "50.00",
      id: "ledger-1",
    } as never);
    const emitSpy = vi.spyOn(domainEvents, "emitIncentiveCredited");

    await submitReview({
      bookingId: "booking-1",
      consumerId: "consumer-1",
      rating: 5,
    });

    expect(incentiveService.creditFiveStarIncentive).toHaveBeenCalledWith({
      bookingId: "booking-1",
      partnerId: "partner-1",
      reviewId: "review-1",
      serviceId: "service-1",
      subtotal: 1000,
    });
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        ledgerEntryId: "ledger-1",
      }),
    );
  });
});

describe("review list wrappers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getPartnerReviews delegates to the repository", async () => {
    const payload = { reviews: [makeReview()], total: 1 };
    const spy = vi
      .spyOn(repo, "listByPartnerId")
      .mockResolvedValue(payload as never);

    const result = await getPartnerReviews("partner-1", { limit: 5 });
    expect(spy).toHaveBeenCalledWith("partner-1", { limit: 5 });
    expect(result).toBe(payload);
  });

  it("listAdminReviews delegates to the repository", async () => {
    const payload = { reviews: [], total: 0 };
    const spy = vi.spyOn(repo, "listAdmin").mockResolvedValue(payload as never);

    const result = await listAdminReviews({ ratingMin: 4 });
    expect(spy).toHaveBeenCalledWith({ ratingMin: 4 });
    expect(result).toBe(payload);
  });
});
