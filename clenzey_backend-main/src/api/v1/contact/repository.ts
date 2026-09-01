import { HttpStatusCode } from "axios";
import { eq } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  bookings,
  contactLogs,
  consumers,
  partners,
  users,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type ContactLogRecord = typeof contactLogs.$inferSelect;
export type ContactLogInsert = typeof contactLogs.$inferInsert;

export const insertContactLog = async (
  data: ContactLogInsert,
): Promise<ContactLogRecord> => {
  const [record] = await db.insert(contactLogs).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create contact log", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findBookingById = async (id: string) => {
  const [record] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return record ?? null;
};

export const findPartnerPhone = async (
  partnerId: string,
): Promise<string | null> => {
  const [row] = await db
    .select({ phone: users.phone })
    .from(partners)
    .innerJoin(users, eq(partners.id, users.id))
    .where(eq(partners.id, partnerId))
    .limit(1);
  return row?.phone ?? null;
};

export const findConsumerPhone = async (
  consumerId: string,
): Promise<string | null> => {
  const [row] = await db
    .select({ phone: users.phone })
    .from(consumers)
    .innerJoin(users, eq(consumers.id, users.id))
    .where(eq(consumers.id, consumerId))
    .limit(1);
  return row?.phone ?? null;
};
