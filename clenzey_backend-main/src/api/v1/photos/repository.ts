import { and, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { bookingPhotos } from "../../../db/schema.ts";

export type BookingPhotoRecord = typeof bookingPhotos.$inferSelect;
export type BookingPhotoInsert = typeof bookingPhotos.$inferInsert;

/**
 * Insert a new photo record for a booking.
 */
export const insertPhoto = async (
  data: BookingPhotoInsert,
): Promise<BookingPhotoRecord> => {
  const [record] = await db.insert(bookingPhotos).values(data).returning();
  return record!;
};

/**
 * List all photos for a given booking, ordered by upload time ascending.
 */
export const listByBookingId = async (
  bookingId: string,
): Promise<BookingPhotoRecord[]> => {
  return await db
    .select()
    .from(bookingPhotos)
    .where(eq(bookingPhotos.bookingId, bookingId))
    .orderBy(bookingPhotos.uploadedAt);
};

/**
 * Count photos for a booking filtered by type (BEFORE or AFTER).
 */
export const countByBookingIdAndType = async (
  bookingId: string,
  type: "BEFORE" | "AFTER",
): Promise<number> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingPhotos)
    .where(
      and(
        eq(bookingPhotos.bookingId, bookingId),
        eq(bookingPhotos.type, type),
      ),
    );
  return result?.count ?? 0;
};

/**
 * Count total photos for a booking (both BEFORE and AFTER combined).
 */
export const countByBookingId = async (
  bookingId: string,
): Promise<number> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingPhotos)
    .where(eq(bookingPhotos.bookingId, bookingId));
  return result?.count ?? 0;
};
