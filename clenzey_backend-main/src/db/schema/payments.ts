import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { paymentStatusEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const payments = pgTable(
  "payments",
  {
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at", {
      mode: "date",
      withTimezone: true,
    }),
    currency: text("currency").default("INR").notNull(),
    failureReason: text("failure_reason"),
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").default("RAZORPAY").notNull(),
    rawPayload: jsonb("raw_payload"),
    razorpayOrderId: text("razorpay_order_id").unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    razorpaySignature: text("razorpay_signature"),
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    ...timestamps,
  },
  (t) => [
    index("payments_booking_id_idx").on(t.bookingId),
    index("payments_status_idx").on(t.status),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    eventType: text("event_type").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
    provider: text("provider").default("RAZORPAY").notNull(),
    providerEventId: text("provider_event_id").unique(),
  },
  (t) => [index("payment_events_payment_id_idx").on(t.paymentId)],
);
