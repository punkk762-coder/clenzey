import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as reviewsService from "./service.ts";

export const submitReview: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user!.sub;
  const { bookingId, rating, review } = req.body as {
    bookingId: string;
    rating: number;
    review?: string;
  };

  const input: reviewsService.SubmitReviewInput = {
    bookingId,
    consumerId,
    rating,
  };
  if (review !== undefined) {
    input.review = review;
  }

  const result = await reviewsService.submitReview(input);

  return sendResponse(res, {
    data: { review: result },
    statusCode: HttpStatusCode.Created,
  });
});

export const getBookingReviewStatus: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user?.sub;
    if (!consumerId) throw new UnauthorizedError();

    const bookingId = req.params["bookingId"] as string;
    const reviewStatus = await reviewsService.getReviewStatusForBooking(
      bookingId,
      consumerId,
    );

    return sendResponse(res, { data: { reviewStatus } });
  },
);

export const getPartnerReviews: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.params["partnerId"] as string;
    const { limit, offset } = (
      req as unknown as {
        validatedQuery: { limit?: number; offset?: number };
      }
    ).validatedQuery;

    const opts: { limit?: number; offset?: number } = {};
    if (limit !== undefined) opts.limit = limit;
    if (offset !== undefined) opts.offset = offset;

    const result = await reviewsService.getPartnerReviews(partnerId, opts);

    return sendResponse(res, { data: result });
  },
);

export const listAdminReviews: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const filters = (
      req as unknown as {
        validatedQuery: {
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
        };
      }
    ).validatedQuery;

    const result = await reviewsService.listAdminReviews(filters);

    return sendResponse(res, { data: result });
  },
);
