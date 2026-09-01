import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { assignmentStatusEnum, dayOfWeekEnum } from "./enums.ts";
import { geographyPoint, timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";
import { services } from "./services.ts";

export const timeSlots = pgTable(
  "time_slots",
  {
    capacity: integer("capacity").notNull().default(5),
    endAt: timestamp("end_at", { mode: "date", withTimezone: true }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    isActive: boolean("is_active").default(true).notNull(),
    reservedCount: integer("reserved_count").notNull().default(0),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("time_slots_service_start_idx").on(t.serviceId, t.startAt),
    uniqueIndex("time_slots_unique_idx").on(t.serviceId, t.startAt),
  ],
);

export const partnerAvailability = pgTable(
  "partner_availability",
  {
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    endHour: integer("end_hour").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    isActive: boolean("is_active").default(true).notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    startHour: integer("start_hour").notNull(),
    ...timestamps,
  },
  (t) => [
    index("partner_availability_partner_idx").on(t.partnerId),
    uniqueIndex("partner_availability_partner_day_idx").on(
      t.partnerId,
      t.dayOfWeek,
      t.startHour,
    ),
  ],
);

export const partnerLocations = pgTable(
  "partner_locations",
  {
    heading: numeric("heading", { precision: 5, scale: 2 }),
    isOnline: boolean("is_online").default(false).notNull(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    location: geographyPoint("location"),
    partnerId: uuid("partner_id")
      .primaryKey()
      .references(() => partners.id, { onDelete: "cascade" }),
    speed: numeric("speed", { precision: 6, scale: 2 }),
    ...timestamps,
  },
  (t) => [index("partner_locations_online_idx").on(t.isOnline)],
);

export const bookingAssignments = pgTable(
  "booking_assignments",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    declineReason: text("decline_reason"),
    distanceMeters: integer("distance_meters"),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    proposedAt: timestamp("proposed_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    respondedAt: timestamp("responded_at", {
      mode: "date",
      withTimezone: true,
    }),
    status: assignmentStatusEnum("status").default("PROPOSED").notNull(),
    ...timestamps,
  },
  (t) => [
    index("booking_assignments_booking_idx").on(t.bookingId),
    index("booking_assignments_partner_idx").on(t.partnerId),
    index("booking_assignments_status_idx").on(t.status),
  ],
);
