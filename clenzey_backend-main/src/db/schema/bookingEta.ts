import {
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";

export const bookingEta = pgTable("booking_eta", {
  bookingId: uuid("booking_id")
    .primaryKey()
    .references(() => bookings.id, { onDelete: "cascade" }),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),
  etaMinutes: integer("eta_minutes").notNull(),
  lastPartnerLat: numeric("last_partner_lat", { precision: 10, scale: 7 }),
  lastPartnerLng: numeric("last_partner_lng", { precision: 10, scale: 7 }),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});
