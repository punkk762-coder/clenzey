import { and, desc, eq, inArray, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { bookings, disputeEvidence, disputes, partners } from "../../../db/schema.ts";

export type DisputeRecord = typeof disputes.$inferSelect;
export type DisputeInsert = typeof disputes.$inferInsert;
export type DisputeEvidenceRecord = typeof disputeEvidence.$inferSelect;
export type DisputeEvidenceInsert = typeof disputeEvidence.$inferInsert;

const ACTIVE_STATUSES: DisputeRecord["status"][] = ["OPEN", "UNDER_REVIEW"];

export const insertDispute = async (
  data: DisputeInsert,
): Promise<DisputeRecord> => {
  const [record] = await db.insert(disputes).values(data).returning();
  return record!;
};

export const findActiveByBookingAndUser = async (
  bookingId: string,
  raisedById: string,
): Promise<DisputeRecord | null> => {
  const [record] = await db
    .select()
    .from(disputes)
    .where(
      and(
        eq(disputes.bookingId, bookingId),
        eq(disputes.raisedById, raisedById),
        inArray(disputes.status, ACTIVE_STATUSES),
      ),
    )
    .limit(1);
  return record ?? null;
};

export const findLatestByBookingAndUser = async (
  bookingId: string,
  raisedById: string,
): Promise<DisputeRecord | null> => {
  const [record] = await db
    .select()
    .from(disputes)
    .where(
      and(
        eq(disputes.bookingId, bookingId),
        eq(disputes.raisedById, raisedById),
      ),
    )
    .orderBy(desc(disputes.createdAt))
    .limit(1);
  return record ?? null;
};

export const listByUser = async (
  userId: string,
  opts: {
    limit?: number;
    offset?: number;
    status?: DisputeRecord["status"];
  } = {},
): Promise<{ disputes: DisputeRecord[]; total: number }> => {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const conditions = [eq(disputes.raisedById, userId)];
  if (opts.status) conditions.push(eq(disputes.status, opts.status));
  const where = and(...conditions);

  const [records, countResult] = await Promise.all([
    db
      .select()
      .from(disputes)
      .where(where)
      .orderBy(desc(disputes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(disputes)
      .where(where),
  ]);

  return { disputes: records, total: countResult[0]?.count ?? 0 };
};

type AdminListFilters = {
  bookingId?: string;
  category?: DisputeRecord["category"];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  status?: DisputeRecord["status"];
};

export type AdminDisputeListItem = DisputeRecord & {
  bookingNumber: string;
  consumerName: string;
  partnerId: string | null;
  partnerName: string | null;
};

export const listAdmin = async (
  filters: AdminListFilters = {},
): Promise<{ disputes: AdminDisputeListItem[]; total: number }> => {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const conditions = [];
  if (filters.status) conditions.push(eq(disputes.status, filters.status));
  if (filters.category) conditions.push(eq(disputes.category, filters.category));
  if (filters.bookingId) {
    conditions.push(eq(disputes.bookingId, filters.bookingId));
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${disputes.createdAt} >= ${new Date(filters.dateFrom)}`,
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${disputes.createdAt} <= ${new Date(filters.dateTo)}`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [records, countResult] = await Promise.all([
    db
      .select({
        id: disputes.id,
        bookingId: disputes.bookingId,
        category: disputes.category,
        description: disputes.description,
        raisedById: disputes.raisedById,
        raisedByType: disputes.raisedByType,
        resolutionNotes: disputes.resolutionNotes,
        resolvedAt: disputes.resolvedAt,
        resolvedBy: disputes.resolvedBy,
        status: disputes.status,
        createdAt: disputes.createdAt,
        updatedAt: disputes.updatedAt,
        bookingNumber: bookings.bookingNumber,
        consumerName: bookings.consumerName,
        partnerId: bookings.partnerId,
        partnerName: partners.fullName,
      })
      .from(disputes)
      .innerJoin(bookings, eq(bookings.id, disputes.bookingId))
      .leftJoin(partners, eq(partners.id, bookings.partnerId))
      .where(where)
      .orderBy(desc(disputes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(disputes)
      .where(where),
  ]);

  return { disputes: records, total: countResult[0]?.count ?? 0 };
};

export const updateDispute = async (
  id: string,
  patch: Partial<
    Pick<
      DisputeInsert,
      "resolutionNotes" | "resolvedAt" | "resolvedBy" | "status"
    >
  >,
): Promise<DisputeRecord | null> => {
  const [record] = await db
    .update(disputes)
    .set(patch)
    .where(eq(disputes.id, id))
    .returning();
  return record ?? null;
};

export const findDisputeById = async (
  id: string,
): Promise<DisputeRecord | null> => {
  const [record] = await db
    .select()
    .from(disputes)
    .where(eq(disputes.id, id))
    .limit(1);
  return record ?? null;
};

export type AdminDisputeDetail = {
  booking: {
    bookingNumber: string;
    cancelledAt: Date | null;
    completedAt: Date | null;
    consumerId: string;
    consumerName: string;
    id: string;
    partnerId: string | null;
    status: string;
    totalAmount: string;
  };
  dispute: DisputeRecord;
};

export const findAdminDetailById = async (
  id: string,
): Promise<AdminDisputeDetail | null> => {
  const [row] = await db
    .select({
      booking: {
        bookingNumber: bookings.bookingNumber,
        cancelledAt: bookings.cancelledAt,
        completedAt: bookings.completedAt,
        consumerId: bookings.consumerId,
        consumerName: bookings.consumerName,
        id: bookings.id,
        partnerId: bookings.partnerId,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      },
      dispute: disputes,
    })
    .from(disputes)
    .innerJoin(bookings, eq(bookings.id, disputes.bookingId))
    .where(eq(disputes.id, id))
    .limit(1);

  return row ?? null;
};

export const insertDisputeEvidence = async (
  data: DisputeEvidenceInsert,
): Promise<DisputeEvidenceRecord> => {
  const [record] = await db.insert(disputeEvidence).values(data).returning();
  return record!;
};

export const countEvidenceByDisputeId = async (
  disputeId: string,
): Promise<number> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(disputeEvidence)
    .where(eq(disputeEvidence.disputeId, disputeId));
  return result?.count ?? 0;
};

export const listEvidenceByDisputeId = async (
  disputeId: string,
): Promise<DisputeEvidenceRecord[]> => {
  return await db
    .select()
    .from(disputeEvidence)
    .where(eq(disputeEvidence.disputeId, disputeId))
    .orderBy(desc(disputeEvidence.createdAt));
};
