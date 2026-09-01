import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { userTypeEnum } from "./enums.ts";

export const contactLogs = pgTable(
  "contact_logs",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    consumerId: uuid("consumer_id").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id").notNull(),
    requestedBy: uuid("requested_by").notNull(),
    requestedByType: userTypeEnum("requested_by_type").notNull(),
    timestamp: timestamp("timestamp", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("contact_logs_booking_id_idx").on(t.bookingId)],
);
