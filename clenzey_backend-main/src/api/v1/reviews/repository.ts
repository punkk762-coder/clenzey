import { HttpStatusCode } from "axios";
import { and, avg, count, desc, eq, gte, ilike, lte } from "drizzle-orm";

import db from "../../../db/index.ts";
import { consumers, partners, reviews } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type ReviewRecord = typeof reviews.$inferSelect;
export type ReviewInsert = typeof reviews.$inferInsert;

export type AdminReviewRecord = ReviewRecord & {
  consumerName: string | null;
  partnerName: string | null;
};

export const insertReview = async (
  data: ReviewInsert,
): Promise<ReviewRecord> => {
  const [record] = await db.insert(reviews).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create review", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findByBookingId = async (
  bookingId: string,
): Promise<ReviewRecord | null> => {
  const [record] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.bookingId, bookingId))
    .limit(1);
  return record ?? null;
};

export const listByPartnerId = async (
  partnerId: string,
  opts: { limit?: number; offset?: number },
): Promise<{ reviews: ReviewRecord[]; total: number }> => {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(reviews)
      .where(eq(reviews.partnerId, partnerId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(reviews)
      .where(eq(reviews.partnerId, partnerId)),
  ]);

  return {
    reviews: rows,
    total: totalResult[0]?.count ?? 0,
  };
};

export type AdminReviewFilters = {
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

export const listAdmin = async (
  filters: AdminReviewFilters,
): Promise<{ reviews: AdminReviewRecord[]; total: number }> => {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const conditions = [];

  if (filters.partnerId) {
    conditions.push(eq(reviews.partnerId, filters.partnerId));
  }
  if (filters.partnerName) {
    conditions.push(ilike(partners.fullName, `%${filters.partnerName}%`));
  }
  if (filters.consumerId) {
    conditions.push(eq(reviews.consumerId, filters.consumerId));
  }
  if (filters.consumerName) {
    conditions.push(ilike(consumers.fullName, `%${filters.consumerName}%`));
  }
  if (filters.ratingMin !== undefined) {
    conditions.push(gte(reviews.rating, filters.ratingMin));
  }
  if (filters.ratingMax !== undefined) {
    conditions.push(lte(reviews.rating, filters.ratingMax));
  }
  if (filters.dateFrom) {
    conditions.push(gte(reviews.createdAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(reviews.createdAt, new Date(filters.dateTo)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: reviews.id,
        bookingId: reviews.bookingId,
        consumerId: reviews.consumerId,
        partnerId: reviews.partnerId,
        rating: reviews.rating,
        review: reviews.review,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        consumerName: consumers.fullName,
        partnerName: partners.fullName,
      })
      .from(reviews)
      .innerJoin(consumers, eq(reviews.consumerId, consumers.id))
      .innerJoin(partners, eq(reviews.partnerId, partners.id))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(reviews)
      .innerJoin(consumers, eq(reviews.consumerId, consumers.id))
      .innerJoin(partners, eq(reviews.partnerId, partners.id))
      .where(where),
  ]);

  return {
    reviews: rows,
    total: totalResult[0]?.count ?? 0,
  };
};

/**
 * Recalculates the partner's average rating and total review count
 * directly from the reviews table, then updates the partners table.
 */
export const recalculatePartnerRating = async (
  partnerId: string,
): Promise<void> => {
  const [stats] = await db
    .select({
      avgRating: avg(reviews.rating),
      totalReviews: count(),
    })
    .from(reviews)
    .where(eq(reviews.partnerId, partnerId));

  await db
    .update(partners)
    .set({
      avgRating: stats?.avgRating ?? null,
      totalReviews: stats?.totalReviews ?? 0,
    })
    .where(eq(partners.id, partnerId));
};
