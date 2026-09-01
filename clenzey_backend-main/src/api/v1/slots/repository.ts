import { HttpStatusCode } from "axios";
import { and, eq, gt, gte, lte, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { timeSlots } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type TimeSlotRecord = typeof timeSlots.$inferSelect;
export type TimeSlotInsert = typeof timeSlots.$inferInsert;

export const insertTimeSlots = async (
  rows: TimeSlotInsert[],
): Promise<TimeSlotRecord[]> => {
  if (rows.length === 0) return [];
  return await db
    .insert(timeSlots)
    .values(rows)
    .onConflictDoNothing({
      target: [timeSlots.serviceId, timeSlots.startAt],
    })
    .returning();
};

export const findSlotById = async (
  id: string,
): Promise<null | TimeSlotRecord> => {
  const [row] = await db
    .select()
    .from(timeSlots)
    .where(eq(timeSlots.id, id))
    .limit(1);
  return row ?? null;
};

export const listAvailableSlots = async (
  serviceId: string,
  fromAt: Date,
  toAt: Date,
): Promise<TimeSlotRecord[]> => {
  return await db
    .select()
    .from(timeSlots)
    .where(
      and(
        eq(timeSlots.serviceId, serviceId),
        eq(timeSlots.isActive, true),
        gte(timeSlots.startAt, fromAt),
        lte(timeSlots.startAt, toAt),
        gt(timeSlots.capacity, timeSlots.reservedCount),
      ),
    )
    .orderBy(timeSlots.startAt);
};

export const listSlotsForAdmin = async (
  serviceId: string,
  fromAt: Date,
  toAt: Date,
): Promise<TimeSlotRecord[]> => {
  return await db
    .select()
    .from(timeSlots)
    .where(
      and(
        eq(timeSlots.serviceId, serviceId),
        gte(timeSlots.startAt, fromAt),
        lte(timeSlots.startAt, toAt),
      ),
    )
    .orderBy(timeSlots.startAt);
};

export const updateSlotCapacity = async (
  id: string,
  capacity: number,
): Promise<TimeSlotRecord> => {
  const [row] = await db
    .update(timeSlots)
    .set({ capacity })
    .where(eq(timeSlots.id, id))
    .returning();
  if (!row) {
    throw new AppError("Failed to update slot capacity", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

/**
 * Atomically increments reserved_count if capacity > reserved_count.
 * Returns the updated slot, or null if the slot is full / inactive / missing.
 */
export const tryReserveSlot = async (
  slotId: string,
): Promise<null | TimeSlotRecord> => {
  const [row] = await db
    .update(timeSlots)
    .set({ reservedCount: sql`${timeSlots.reservedCount} + 1` })
    .where(
      and(
        eq(timeSlots.id, slotId),
        eq(timeSlots.isActive, true),
        gt(timeSlots.capacity, timeSlots.reservedCount),
      ),
    )
    .returning();
  return row ?? null;
};

export const releaseSlot = async (slotId: string): Promise<void> => {
  await db
    .update(timeSlots)
    .set({
      reservedCount: sql`GREATEST(${timeSlots.reservedCount} - 1, 0)`,
    })
    .where(eq(timeSlots.id, slotId));
};
