import {
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { consumers } from "./consumers.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";

export const reviews = pgTable(
  "reviews",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    consumerId: uuid("consumer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    review: text("review"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("reviews_booking_id_unique").on(t.bookingId),
    index("reviews_partner_id_idx").on(t.partnerId),
    index("reviews_consumer_id_idx").on(t.consumerId),
    index("reviews_created_at_idx").on(t.createdAt),
  ],
);
