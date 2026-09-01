import { and, eq } from "drizzle-orm";
import { HttpStatusCode } from "axios";

import db from "../../../db/index.ts";
import { maskedCallSessions } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type MaskedCallSessionRecord = typeof maskedCallSessions.$inferSelect;
export type MaskedCallSessionInsert = typeof maskedCallSessions.$inferInsert;

export const insertSession = async (
  data: MaskedCallSessionInsert,
): Promise<MaskedCallSessionRecord> => {
  const [record] = await db
    .insert(maskedCallSessions)
    .values(data)
    .returning();
  if (!record) {
    throw new AppError("Failed to create masked call session", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findActiveSession = async (
  bookingId: string,
): Promise<MaskedCallSessionRecord | null> => {
  const [record] = await db
    .select()
    .from(maskedCallSessions)
    .where(
      and(
        eq(maskedCallSessions.bookingId, bookingId),
        eq(maskedCallSessions.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return record ?? null;
};

export const deactivateSession = async (
  bookingId: string,
): Promise<MaskedCallSessionRecord | null> => {
  const [record] = await db
    .update(maskedCallSessions)
    .set({ status: "CLOSED", updatedAt: new Date() })
    .where(
      and(
        eq(maskedCallSessions.bookingId, bookingId),
        eq(maskedCallSessions.status, "ACTIVE"),
      ),
    )
    .returning();
  return record ?? null;
};

export const findSessionById = async (
  id: string,
): Promise<MaskedCallSessionRecord | null> => {
  const [record] = await db
    .select()
    .from(maskedCallSessions)
    .where(eq(maskedCallSessions.id, id))
    .limit(1);
  return record ?? null;
};
