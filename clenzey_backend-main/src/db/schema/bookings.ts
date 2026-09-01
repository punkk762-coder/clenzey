import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { consumerAddresses, consumers } from "./consumers.ts";
import {
  bookingStatusEnum,
  bookingTypeEnum,
  paymentStatusEnum,
  subscriptionPlanEnum,
  userTypeEnum,
} from "./enums.ts";
import type { LargeOfficeScope } from "../../api/v1/services/largeOfficePricing.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";
import { services } from "./services.ts";

export type CorporateDetailsJson = {
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  gstNumber?: string;
  cleaningFrequency:
    | "ONE_TIME"
    | "DAILY"
    | "WEEKLY"
    | "FORTNIGHTLY"
    | "MONTHLY"
    | "CUSTOM";
  schedulePreference:
    | "BEFORE_OFFICE"
    | "DURING_OFFICE"
    | "AFTER_OFFICE"
    | "WEEKEND";
  estimatedBasePrice?: number;
  estimatedTeam?: number;
  largeOfficeScope?: LargeOfficeScope;
};

export const bookings = pgTable(
  "bookings",
  {
    addressId: uuid("address_id")
      .notNull()
      .references(() => consumerAddresses.id, { onDelete: "restrict" }),
    addonsTotal: numeric("addons_total", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    addressSnapshot: text("address_snapshot").notNull(),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    bookingNumber: text("booking_number").unique().notNull(),
    bookingType: bookingTypeEnum("booking_type").notNull(),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", {
      mode: "date",
      withTimezone: true,
    }),
    cancelledById: uuid("cancelled_by_id"),
    cancelledByType: userTypeEnum("cancelled_by_type"),
    checkInCode: varchar("check_in_code", { length: 4 }).notNull(),
    checkInCodeAttempts: integer("check_in_code_attempts").notNull().default(0),
    checkInCodeVerifiedAt: timestamp("check_in_code_verified_at", {
      mode: "date",
      withTimezone: true,
    }),
    checkedInAt: timestamp("checked_in_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    confirmedAt: timestamp("confirmed_at", {
      mode: "date",
      withTimezone: true,
    }),
    consumerId: uuid("consumer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "restrict" }),
    consumerName: text("consumer_name").notNull(),
    consumerNotes: text("consumer_notes"),
    consumerPhone: text("consumer_phone").notNull(),
    couponCode: text("coupon_code"),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    enRouteAt: timestamp("en_route_at", { mode: "date", withTimezone: true }),
    estimatedDurationMin: integer("estimated_duration_min")
      .notNull()
      .default(60),
    id: uuid("id").primaryKey().defaultRandom(),
    internalNotes: text("internal_notes"),
    partnerAssignedAt: timestamp("partner_assigned_at", {
      mode: "date",
      withTimezone: true,
    }),
    partnerId: uuid("partner_id").references(() => partners.id, {
      onDelete: "set null",
    }),
    paymentMode: text("payment_mode"),
    paymentStatus: paymentStatusEnum("payment_status")
      .default("PENDING")
      .notNull(),
    platformFee: numeric("platform_fee", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    scheduledAt: timestamp("scheduled_at", {
      mode: "date",
      withTimezone: true,
    }),
    scheduledEndAt: timestamp("scheduled_end_at", {
      mode: "date",
      withTimezone: true,
    }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    serviceName: text("service_name").notNull(),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: true }),
    status: bookingStatusEnum("status").default("PENDING").notNull(),
    subscriptionPlan: subscriptionPlanEnum("subscription_plan")
      .default("ONE_TIME")
      .notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    surgeAmount: numeric("surge_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    surgeMultiplier: numeric("surge_multiplier", { precision: 4, scale: 2 })
      .notNull()
      .default("1.00"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    timeSlotId: uuid("time_slot_id"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    variantId: uuid("variant_id").notNull(),
    variantLabel: text("variant_label").notNull(),
    subVariantId: text("sub_variant_id"),
    subVariantLabel: text("sub_variant_label"),
    bookingName: text("booking_name"),
    corporateDetails: jsonb("corporate_details").$type<CorporateDetailsJson>(),
    ...timestamps,
  },
  (t) => [
    index("bookings_consumer_id_idx").on(t.consumerId),
    index("bookings_partner_id_idx").on(t.partnerId),
    index("bookings_status_idx").on(t.status),
    index("bookings_scheduled_at_idx").on(t.scheduledAt),
    index("bookings_booking_number_idx").on(t.bookingNumber),
  ],
);

export const bookingAddons = pgTable(
  "booking_addons",
  {
    addonId: uuid("addon_id"),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    ...timestamps,
  },
  (t) => [index("booking_addons_booking_id_idx").on(t.bookingId)],
);

export const bookingStatusHistory = pgTable(
  "booking_status_history",
  {
    actorId: uuid("actor_id"),
    actorType: userTypeEnum("actor_type"),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    fromStatus: bookingStatusEnum("from_status"),
    id: uuid("id").primaryKey().defaultRandom(),
    metadata: jsonb("metadata"),
    reason: text("reason"),
    toStatus: bookingStatusEnum("to_status").notNull(),
  },
  (t) => [
    index("booking_status_history_booking_id_idx").on(t.bookingId),
    index("booking_status_history_created_at_idx").on(t.createdAt),
  ],
);

export const maskedCallSessions = pgTable(
  "masked_call_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    twilioProxySessionSid: text("twilio_proxy_session_sid").notNull(),
    virtualNumber: text("virtual_number").notNull(),
    status: text("status", { enum: ["ACTIVE", "CLOSED"] })
      .default("ACTIVE")
      .notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("masked_call_sessions_booking_idx").on(t.bookingId),
    index("masked_call_sessions_status_idx").on(t.status),
  ],
);
