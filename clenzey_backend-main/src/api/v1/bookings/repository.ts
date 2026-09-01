import { HttpStatusCode } from "axios";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  bookingAddons,
  bookingAssignments,
  bookings,
  bookingStatusHistory,
  consumerAddresses,
  consumers,
  users,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type BookingRecord = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;
export type BookingAddonRecord = typeof bookingAddons.$inferSelect;
export type BookingAddonInsert = typeof bookingAddons.$inferInsert;
export type BookingHistoryRecord = typeof bookingStatusHistory.$inferSelect;
export type BookingHistoryInsert = typeof bookingStatusHistory.$inferInsert;
export type AssignmentRecord = typeof bookingAssignments.$inferSelect;
export type AssignmentInsert = typeof bookingAssignments.$inferInsert;

export const insertBooking = async (
  data: BookingInsert,
): Promise<BookingRecord> => {
  const [record] = await db.insert(bookings).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create booking", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const insertBookingAddons = async (
  rows: BookingAddonInsert[],
): Promise<BookingAddonRecord[]> => {
  if (rows.length === 0) return [];
  return await db.insert(bookingAddons).values(rows).returning();
};

export const insertStatusHistory = async (
  data: BookingHistoryInsert,
): Promise<BookingHistoryRecord> => {
  const [record] = await db
    .insert(bookingStatusHistory)
    .values(data)
    .returning();
  if (!record) {
    throw new AppError("Failed to record status change", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findBookingById = async (
  id: string,
): Promise<BookingRecord | null> => {
  const [record] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return record ?? null;
};

export const findBookingByNumber = async (
  bookingNumber: string,
): Promise<BookingRecord | null> => {
  const [record] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingNumber, bookingNumber))
    .limit(1);
  return record ?? null;
};

export const findAddonsByBookingId = async (
  bookingId: string,
): Promise<BookingAddonRecord[]> => {
  return await db
    .select()
    .from(bookingAddons)
    .where(eq(bookingAddons.bookingId, bookingId));
};

export const findHistoryByBookingId = async (
  bookingId: string,
): Promise<BookingHistoryRecord[]> => {
  return await db
    .select()
    .from(bookingStatusHistory)
    .where(eq(bookingStatusHistory.bookingId, bookingId))
    .orderBy(bookingStatusHistory.createdAt);
};

type ListBookingsFilter = {
  consumerId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  partnerId?: string;
  serviceId?: string;
  status?: BookingRecord["status"];
  statuses?: BookingRecord["status"][];
};

function buildListBookingsWhere(filter: ListBookingsFilter) {
  const conditions = [];
  if (filter.consumerId)
    conditions.push(eq(bookings.consumerId, filter.consumerId));
  if (filter.partnerId)
    conditions.push(eq(bookings.partnerId, filter.partnerId));
  if (filter.serviceId)
    conditions.push(eq(bookings.serviceId, filter.serviceId));
  if (filter.status) conditions.push(eq(bookings.status, filter.status));
  if (filter.statuses?.length) {
    conditions.push(inArray(bookings.status, filter.statuses));
  }
  if (filter.dateFrom) {
    conditions.push(gte(bookings.createdAt, new Date(filter.dateFrom)));
  }
  if (filter.dateTo) {
    const to = new Date(filter.dateTo);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(bookings.createdAt, to));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const countBookings = async (
  filter: Omit<ListBookingsFilter, "limit" | "offset">,
): Promise<number> => {
  const where = buildListBookingsWhere(filter);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(where);
  return row?.count ?? 0;
};

export const listBookings = async (
  filter: ListBookingsFilter,
): Promise<BookingRecord[]> => {
  const where = buildListBookingsWhere(filter);

  return await db
    .select()
    .from(bookings)
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(filter.limit ?? 20)
    .offset(filter.offset ?? 0);
};

export const updateBooking = async (
  id: string,
  patch: Partial<BookingInsert>,
): Promise<BookingRecord> => {
  const [record] = await db
    .update(bookings)
    .set(patch)
    .where(eq(bookings.id, id))
    .returning();
  if (!record) {
    throw new AppError("Failed to update booking", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findAddressById = async (id: string) => {
  const [record] = await db
    .select()
    .from(consumerAddresses)
    .where(
      and(
        eq(consumerAddresses.id, id),
        isNull(consumerAddresses.deletedAt),
      ),
    )
    .limit(1);
  return record ?? null;
};

export const findConsumerProfileById = async (id: string) => {
  const [row] = await db
    .select({
      fullName: consumers.fullName,
      id: consumers.id,
      phone: users.phone,
    })
    .from(consumers)
    .innerJoin(users, eq(consumers.id, users.id))
    .where(eq(consumers.id, id))
    .limit(1);
  return row ?? null;
};

export const generateBookingNumber = async (): Promise<string> => {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const result = await db.execute<{ next: number }>(
    sql`SELECT (COUNT(*) + 1)::int AS next FROM bookings WHERE booking_number LIKE ${`BK-${datePart}-%`}`,
  );
  const next = result.rows[0]?.next ?? 1;
  const seq = String(next).padStart(4, "0");
  return `BK-${datePart}-${seq}`;
};

// ── Assignments ─────────────────────────────────────────────────────────────

export const insertAssignment = async (
  data: AssignmentInsert,
): Promise<AssignmentRecord> => {
  const [row] = await db.insert(bookingAssignments).values(data).returning();
  if (!row) {
    throw new AppError("Failed to create assignment", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const findOpenAssignment = async (
  bookingId: string,
  partnerId: string,
): Promise<AssignmentRecord | null> => {
  const [row] = await db
    .select()
    .from(bookingAssignments)
    .where(
      and(
        eq(bookingAssignments.bookingId, bookingId),
        eq(bookingAssignments.partnerId, partnerId),
        eq(bookingAssignments.status, "PROPOSED"),
      ),
    )
    .limit(1);
  return row ?? null;
};

export const listOpenAssignmentsForPartner = async (
  partnerId: string,
): Promise<AssignmentRecord[]> => {
  return await db
    .select()
    .from(bookingAssignments)
    .where(
      and(
        eq(bookingAssignments.partnerId, partnerId),
        eq(bookingAssignments.status, "PROPOSED"),
      ),
    )
    .orderBy(bookingAssignments.proposedAt);
};

export const listOpenAssignmentsForPartnerWithBookings = async (
  partnerId: string,
) => {
  return await db
    .select({
      assignment: bookingAssignments,
      booking: bookings,
    })
    .from(bookingAssignments)
    .innerJoin(bookings, eq(bookingAssignments.bookingId, bookings.id))
    .where(
      and(
        eq(bookingAssignments.partnerId, partnerId),
        eq(bookingAssignments.status, "PROPOSED"),
      ),
    )
    .orderBy(bookingAssignments.proposedAt);
};

export const findAssignmentForPartner = async (
  assignmentId: string,
  partnerId: string,
) => {
  const [row] = await db
    .select({
      assignment: bookingAssignments,
      booking: bookings,
    })
    .from(bookingAssignments)
    .innerJoin(bookings, eq(bookingAssignments.bookingId, bookings.id))
    .where(
      and(
        eq(bookingAssignments.id, assignmentId),
        eq(bookingAssignments.partnerId, partnerId),
      ),
    )
    .limit(1);
  return row ?? null;
};

export const respondToAssignment = async (
  id: string,
  status: "ACCEPTED" | "DECLINED" | "EXPIRED",
  reason?: string,
): Promise<AssignmentRecord | null> => {
  const [row] = await db
    .update(bookingAssignments)
    .set({
      declineReason: reason ?? null,
      respondedAt: new Date(),
      status,
    })
    .where(
      and(
        eq(bookingAssignments.id, id),
        eq(bookingAssignments.status, "PROPOSED"),
      ),
    )
    .returning();
  return row ?? null;
};

/**
 * Find the active en-route booking for a partner.
 * Returns the first booking in PROFESSIONAL_EN_ROUTE status assigned to the partner.
 */
export const findEnRouteBookingForPartner = async (
  partnerId: string,
): Promise<BookingRecord | null> => {
  const [record] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.partnerId, partnerId),
        eq(bookings.status, "PROFESSIONAL_EN_ROUTE"),
      ),
    )
    .limit(1);
  return record ?? null;
};

/**
 * Count reschedules for a booking by checking status history metadata where type='RESCHEDULE'.
 */
export const countReschedules = async (bookingId: string): Promise<number> => {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bookingStatusHistory)
    .where(
      and(
        eq(bookingStatusHistory.bookingId, bookingId),
        sql`${bookingStatusHistory.metadata}->>'type' = 'RESCHEDULE'`,
      ),
    );
  return result?.count ?? 0;
};

/**
 * Check if a booking already has an accepted assignment.
 */
export const hasAcceptedAssignment = async (
  bookingId: string,
): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bookingAssignments)
    .where(
      and(
        eq(bookingAssignments.bookingId, bookingId),
        eq(bookingAssignments.status, "ACCEPTED"),
      ),
    );
  return (result?.count ?? 0) > 0;
};

/**
 * Expire all PROPOSED assignments for a booking whose expiresAt has passed.
 * Returns the number of expired assignments.
 */
export const expireProposedAssignments = async (
  bookingId: string,
): Promise<number> => {
  const expired = await db
    .update(bookingAssignments)
    .set({ status: "EXPIRED", respondedAt: new Date() })
    .where(
      and(
        eq(bookingAssignments.bookingId, bookingId),
        eq(bookingAssignments.status, "PROPOSED"),
        sql`${bookingAssignments.expiresAt} <= NOW()`,
      ),
    )
    .returning();
  return expired.length;
};

/**
 * Get the list of partner IDs that have already been proposed for a booking
 * (any status: PROPOSED, ACCEPTED, DECLINED, EXPIRED).
 */
export const getProposedPartnerIds = async (
  bookingId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ partnerId: bookingAssignments.partnerId })
    .from(bookingAssignments)
    .where(eq(bookingAssignments.bookingId, bookingId));
  return rows.map((r) => r.partnerId);
};

/**
 * Check if a partner has an overlapping active booking in the same time window.
 * Active statuses: PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS.
 * If the booking has no scheduledAt/scheduledEndAt, checks for any active booking.
 */
export const hasOverlappingActiveBooking = async (
  partnerId: string,
  scheduledAt: Date | null,
  scheduledEndAt: Date | null,
  excludeBookingId?: string,
): Promise<boolean> => {
  const conditions = [
    eq(bookings.partnerId, partnerId),
    sql`${bookings.status} IN ('PROFESSIONAL_ASSIGNED', 'PROFESSIONAL_EN_ROUTE', 'CHECKED_IN', 'IN_PROGRESS')`,
  ];

  if (excludeBookingId) {
    conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
  }

  // If we have time window info, check for overlap
  if (scheduledAt && scheduledEndAt) {
    conditions.push(
      sql`${bookings.scheduledAt} < ${scheduledEndAt} AND ${bookings.scheduledEndAt} > ${scheduledAt}`,
    );
  }

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bookings)
    .where(and(...conditions));

  return (result?.count ?? 0) > 0;
};
