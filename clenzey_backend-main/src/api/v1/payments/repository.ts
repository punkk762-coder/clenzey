import { HttpStatusCode } from "axios";
import { eq } from "drizzle-orm";

import db from "../../../db/index.ts";
import { paymentEvents, payments } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type PaymentRecord = typeof payments.$inferSelect;
export type PaymentInsert = typeof payments.$inferInsert;
export type PaymentEventInsert = typeof paymentEvents.$inferInsert;

export const insertPayment = async (
  data: PaymentInsert,
): Promise<PaymentRecord> => {
  const [row] = await db.insert(payments).values(data).returning();
  if (!row) {
    throw new AppError("Failed to create payment", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const findPaymentByOrderId = async (
  orderId: string,
): Promise<null | PaymentRecord> => {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpayOrderId, orderId))
    .limit(1);
  return row ?? null;
};

export const findPaymentByBookingId = async (
  bookingId: string,
): Promise<null | PaymentRecord> => {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .limit(1);
  return row ?? null;
};

export const updatePayment = async (
  id: string,
  patch: Partial<PaymentInsert>,
): Promise<PaymentRecord> => {
  const [row] = await db
    .update(payments)
    .set(patch)
    .where(eq(payments.id, id))
    .returning();
  if (!row) {
    throw new AppError("Failed to update payment", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return row;
};

export const recordEvent = async (
  data: PaymentEventInsert,
): Promise<void> => {
  await db
    .insert(paymentEvents)
    .values(data)
    .onConflictDoNothing({ target: paymentEvents.providerEventId });
};
