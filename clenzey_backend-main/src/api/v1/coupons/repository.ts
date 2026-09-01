import { HttpStatusCode } from "axios";
import { and, desc, eq, gte, isNull, lt, lte, or, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  couponRedemptions,
  coupons,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type CouponRecord = typeof coupons.$inferSelect;
export type CouponInsert = typeof coupons.$inferInsert;
export type RedemptionInsert = typeof couponRedemptions.$inferInsert;

export const insertCoupon = async (
  data: CouponInsert,
): Promise<CouponRecord> => {
  const [record] = await db.insert(coupons).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create coupon", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findCouponByCode = async (
  code: string,
): Promise<CouponRecord | null> => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const [row] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizedCode))
    .limit(1);
  return row ?? null;
};

export const findCouponById = async (
  id: string,
): Promise<CouponRecord | null> => {
  const [row] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);
  return row ?? null;
};

export const listCoupons = async (
  filter: { activeOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<CouponRecord[]> => {
  const where = filter.activeOnly
    ? eq(coupons.isActive, true)
    : undefined;
  return await db
    .select()
    .from(coupons)
    .where(where)
    .orderBy(coupons.createdAt)
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);
};

export const listActiveOffers = async (
  filter: { limit?: number } = {},
): Promise<CouponRecord[]> => {
  const now = new Date();

  return await db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.isActive, true),
        or(isNull(coupons.validFrom), lte(coupons.validFrom, now)),
        or(isNull(coupons.validUntil), gte(coupons.validUntil, now)),
        or(
          isNull(coupons.usageLimit),
          lt(coupons.usageCount, coupons.usageLimit),
        ),
        isNull(coupons.issuedToConsumerId),
      ),
    )
    .orderBy(desc(coupons.createdAt))
    .limit(filter.limit ?? 10);
};

export const updateCoupon = async (
  id: string,
  patch: Partial<CouponInsert>,
): Promise<CouponRecord> => {
  const [row] = await db
    .update(coupons)
    .set(patch)
    .where(eq(coupons.id, id))
    .returning();
  if (!row) {
    throw new AppError("Failed to update coupon", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const countRedemptionsForUser = async (
  couponId: string,
  consumerId: string,
): Promise<number> => {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM coupon_redemptions WHERE coupon_id = ${couponId} AND consumer_id = ${consumerId}`,
  );
  return result.rows[0]?.count ?? 0;
};

export const countTotalBookingsForConsumer = async (
  consumerId: string,
): Promise<number> => {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM bookings WHERE consumer_id = ${consumerId} AND status NOT IN ('CANCELLED')`,
  );
  return result.rows[0]?.count ?? 0;
};

export const incrementUsageCount = async (id: string): Promise<void> => {
  await db
    .update(coupons)
    .set({ usageCount: sql`${coupons.usageCount} + 1` })
    .where(eq(coupons.id, id));
};

export const insertRedemption = async (
  data: RedemptionInsert,
): Promise<void> => {
  await db.insert(couponRedemptions).values(data);
};
