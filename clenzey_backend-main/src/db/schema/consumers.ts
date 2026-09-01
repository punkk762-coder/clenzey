import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { addressTypeEnum } from "./enums.ts";
import { geographyPoint, timestamps } from "./helpers.ts";
import { users } from "./users.ts";
import { serviceZones } from "./zones.ts";

export const consumers = pgTable(
  "consumers",
  {
    fullName: text("full_name"),
    profileImage: text("profile_image"),
    id: uuid("id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
    referralCode: text("referral_code").unique().notNull(),
    referrerId: uuid("referrer_id"),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.referrerId],
      foreignColumns: [t.id],
      name: "consumers_referrer_id_fk",
    }).onDelete("set null"),
  ],
);

export const consumerAddresses = pgTable(
  "consumer_addresses",
  {
    accessNotes: text("access_notes"),
    addressType: addressTypeEnum("address_type").default("HOME").notNull(),
    city: text("city").notNull(),
    consumerId: uuid("consumer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    country: text("country").default("India").notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    id: uuid("id").primaryKey().defaultRandom(),
    isDefault: boolean("is_default").default(false).notNull(),
    isServiceable: boolean("is_serviceable").default(false).notNull(),
    label: text("label").notNull(),
    landmark: text("landmark"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    line1: text("line1").notNull(),
    line2: text("line2"),
    location: geographyPoint("location"),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    pincode: text("pincode").notNull(),
    placeId: text("place_id"),
    recipientName: text("recipient_name"),
    recipientPhone: text("recipient_phone"),
    state: text("state").notNull(),
    zoneId: uuid("zone_id").references(() => serviceZones.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("consumer_addresses_consumer_id_idx").on(t.consumerId),
    index("consumer_addresses_pincode_idx").on(t.pincode),
    index("consumer_addresses_zone_id_idx").on(t.zoneId),
    // Only one default per consumer (among non-deleted rows).
    // Defined as a partial unique index in raw SQL — Drizzle cannot express
    // `WHERE deleted_at IS NULL AND is_default = true` via the API.
    //   CREATE UNIQUE INDEX consumer_addresses_one_default_idx
    //     ON consumer_addresses (consumer_id) WHERE deleted_at IS NULL AND is_default = true;
    // GIST index on geography column also via raw migration:
    //   CREATE INDEX consumer_addresses_location_gix ON consumer_addresses USING GIST (location);
    uniqueIndex("consumer_addresses_consumer_label_idx")
      .on(t.consumerId, t.label)
      .where(sql`deleted_at IS NULL`),
  ],
);
