import { index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { timestamps } from "./helpers.ts";
import { payments } from "./payments.ts";

export const refunds = pgTable(
  "refunds",
  {
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().defaultRandom(),
    initiatedBy: uuid("initiated_by").notNull(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    razorpayRefundId: text("razorpay_refund_id"),
    reason: text("reason"),
    status: text("status").default("INITIATED").notNull(),
    ...timestamps,
  },
  (t) => [
    index("refunds_booking_id_idx").on(t.bookingId),
    index("refunds_payment_id_idx").on(t.paymentId),
    index("refunds_status_idx").on(t.status),
  ],
);
