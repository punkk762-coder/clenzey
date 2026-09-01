import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { disputeCategoryEnum, disputeStatusEnum, userTypeEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const disputes = pgTable(
  "disputes",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    category: disputeCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    raisedById: uuid("raised_by_id").notNull(),
    raisedByType: userTypeEnum("raised_by_type").notNull(),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { mode: "date", withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
    status: disputeStatusEnum("status").default("OPEN").notNull(),
    ...timestamps,
  },
  (t) => [
    index("disputes_booking_id_idx").on(t.bookingId),
    index("disputes_status_idx").on(t.status),
    index("disputes_raised_by_idx").on(t.raisedById),
  ],
);
