import { api } from "./client";
import { customersApi } from "./customers";
import { normalizePaginatedList } from "./normalize";
import { partnersApi } from "./partners";
import { toApiDateRange } from "./params";
import type { Review, ReviewFilter, ReviewListResponse } from "@/types";

export type { ReviewFilter } from "@/types";

type BackendReview = {
  id: string;
  bookingId: string;
  consumerId: string;
  partnerId: string;
  rating: number;
  review?: string | null;
  text?: string | null;
  comment?: string | null;
  consumerName?: string | null;
  partnerName?: string | null;
  createdAt: string | Date;
};

function toIsoDate(value: string | Date | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

/** Normalize backend review records to the admin UI shape. */
export function mapReview(raw: BackendReview): Review {
  return {
    id: raw.id,
    bookingId: raw.bookingId,
    consumerId: raw.consumerId,
    partnerId: raw.partnerId,
    consumerName: raw.consumerName?.trim() ?? "",
    partnerName: raw.partnerName?.trim() ?? "",
    rating: raw.rating,
    text: (raw.text ?? raw.review ?? raw.comment ?? "").trim(),
    createdAt: toIsoDate(raw.createdAt),
  };
}

async function enrichReviewNames(reviews: Review[]): Promise<Review[]> {
  const needsPartner = reviews.some((review) => !review.partnerName);
  const needsConsumer = reviews.some((review) => !review.consumerName);
  if (!needsPartner && !needsConsumer) return reviews;

  const [partners, consumers] = await Promise.all([
    needsPartner ? partnersApi.list({ limit: 200 }) : Promise.resolve([]),
    needsConsumer ? customersApi.list({ limit: 200 }) : Promise.resolve([]),
  ]);

  const partnerMap = new Map(
    partners.map((partner) => [partner.id, partner.fullName ?? ""]),
  );
  const consumerMap = new Map(
    consumers.map((consumer) => [consumer.id, consumer.fullName ?? ""]),
  );

  return reviews.map((review) => ({
    ...review,
    partnerName:
      review.partnerName ||
      partnerMap.get(review.partnerId) ||
      "Unknown partner",
    consumerName:
      review.consumerName ||
      consumerMap.get(review.consumerId) ||
      "Unknown customer",
  }));
}

function toReviewListParams(filter?: ReviewFilter) {
  if (!filter) return undefined;
  const { startDate, endDate, minRating, ...rest } = filter;
  return {
    ...rest,
    ...(minRating !== undefined && { ratingMin: minRating }),
    ...toApiDateRange({ startDate, endDate }),
  };
}

export const reviewsApi = {
  list: async (filter?: ReviewFilter): Promise<ReviewListResponse> => {
    const res = await api.get<{ data: unknown }>("/admin/reviews", {
      params: toReviewListParams(filter),
    });
    const { items, total } = normalizePaginatedList<BackendReview>(
      res.data.data,
      ["reviews"],
    );
    const mapped = items.map(mapReview);
    const data = await enrichReviewNames(mapped);
    return { data, total };
  },
};

/** Compute star distribution from a list of reviews. */
export function computeRatingDistribution(
  reviews: { rating: number }[],
): {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
  total: number;
  averageRating: number;
} {
  const counts = { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 };
  for (const r of reviews) {
    const key = `star${r.rating}` as keyof typeof counts;
    if (key in counts) counts[key]++;
  }
  const total = reviews.length;
  const averageRating =
    total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;
  return { ...counts, total, averageRating };
}
