import { and, desc, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { refunds } from "../../../db/schema.ts";

export type RefundRecord = typeof refunds.$inferSelect;
export type RefundInsert = typeof refunds.$inferInsert;

/**
 * Insert a new refund record.
 */
export const insertRefund = async (
  data: RefundInsert,
): Promise<RefundRecord> => {
  const [record] = await db.insert(refunds).values(data).returning();
  return record!;
};

type ListRefundsFilters = {
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  status?: string;
};

/**
 * List refunds with optional filters (status, date range, bookingId).
 */
export const listRefunds = async (
  filters: ListRefundsFilters = {},
): Promise<{ refunds: RefundRecord[]; total: number }> => {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const conditions = [];
  if (filters.status) conditions.push(eq(refunds.status, filters.status));
  if (filters.bookingId) conditions.push(eq(refunds.bookingId, filters.bookingId));
  if (filters.dateFrom) {
    conditions.push(
      sql`${refunds.createdAt} >= ${new Date(filters.dateFrom)}`,
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${refunds.createdAt} <= ${new Date(filters.dateTo)}`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [records, countResult] = await Promise.all([
    db
      .select()
      .from(refunds)
      .where(where)
      .orderBy(desc(refunds.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(refunds)
      .where(where),
  ]);

  return { refunds: records, total: countResult[0]?.count ?? 0 };
};

/**
 * Update a refund record's status and optional razorpay refund ID.
 */
export const updateRefundStatus = async (
  id: string,
  patch: Partial<Pick<RefundInsert, "razorpayRefundId" | "reason" | "status">>,
): Promise<RefundRecord | null> => {
  const [record] = await db
    .update(refunds)
    .set(patch)
    .where(eq(refunds.id, id))
    .returning();
  return record ?? null;
};

/**
 * Sum of all successfully processed refund amounts for a given payment.
 * Only counts refunds with status INITIATED, PROCESSING, or COMPLETED (not FAILED).
 */
export const sumRefundedForPayment = async (
  paymentId: string,
): Promise<number> => {
  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${refunds.amount}), 0)`,
    })
    .from(refunds)
    .where(
      and(
        eq(refunds.paymentId, paymentId),
        sql`${refunds.status} != 'FAILED'`,
      ),
    );
  return parseFloat(result?.total ?? "0");
};

/**
 * Find a refund by its Razorpay refund ID.
 */
export const findRefundByRazorpayId = async (
  razorpayRefundId: string,
): Promise<RefundRecord | null> => {
  const [record] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.razorpayRefundId, razorpayRefundId))
    .limit(1);
  return record ?? null;
};

/**
 * Find a refund by its internal ID.
 */
export const findRefundById = async (
  id: string,
): Promise<RefundRecord | null> => {
  const [record] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.id, id))
    .limit(1);
  return record ?? null;
};
