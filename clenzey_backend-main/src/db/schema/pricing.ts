import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { consumers } from "./consumers.ts";
import { couponTypeEnum, serviceCategoryEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const coupons = pgTable(
  "coupons",
  {
    applicableCategories: serviceCategoryEnum("applicable_categories")
      .array()
      .default([])
      .notNull(),
    applicableServiceIds: uuid("applicable_service_ids")
      .array()
      .default([])
      .notNull(),
    code: text("code").unique().notNull(),
    description: text("description"),
    discountType: couponTypeEnum("discount_type").notNull(),
    discountValue: numeric("discount_value", {
      precision: 10,
      scale: 2,
    }).notNull(),
    firstBookingOnly: boolean("first_booking_only").default(false).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    issuedToConsumerId: uuid("issued_to_consumer_id").references(
      () => consumers.id,
      { onDelete: "cascade" },
    ),
    isActive: boolean("is_active").default(true).notNull(),
    maxDiscountAmount: numeric("max_discount_amount", {
      precision: 10,
      scale: 2,
    }),
    minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    perUserLimit: integer("per_user_limit"),
    usageCount: integer("usage_count").default(0).notNull(),
    usageLimit: integer("usage_limit"),
    validFrom: timestamp("valid_from", { mode: "date", withTimezone: true }),
    validUntil: timestamp("valid_until", { mode: "date", withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("coupons_code_idx").on(t.code)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    consumerId: uuid("consumer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    discountAmount: numeric("discount_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
  },
  (t) => [
    index("coupon_redemptions_coupon_id_idx").on(t.couponId),
    index("coupon_redemptions_consumer_id_idx").on(t.consumerId),
  ],
);

