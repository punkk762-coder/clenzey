import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { photoTypeEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const bookingPhotos = pgTable(
  "booking_photos",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    type: photoTypeEnum("type").notNull(),
    uploadedAt: timestamp("uploaded_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    uploadedBy: uuid("uploaded_by").notNull(),
    ...timestamps,
  },
  (t) => [
    index("booking_photos_booking_id_idx").on(t.bookingId),
    index("booking_photos_type_idx").on(t.bookingId, t.type),
  ],
);
