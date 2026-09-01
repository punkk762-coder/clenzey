import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  pricingModelEnum,
  quotationStatusEnum,
  serviceCategoryEnum,
} from "./enums.ts";
import { timestamps } from "./helpers.ts";
import { consumers } from "./consumers.ts";

// ─── Service inline structures (stored as JSONB on services) ─────────

export type ServiceInclusionJson = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
};

export type ServiceSubVariantJson = {
  id: string;
  label: string;
  description?: string | null;
  basePrice: string;
  discountedPrice: string;
  discountPercentage: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder: number;
};

export type ServiceVariantJson = {
  id: string;
  label: string;
  value: string;
  basePrice: string;
  discountedPrice?: string;
  discountPercentage?: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder: number;
  inclusions?: ServiceInclusionJson[];
  subVariants?: ServiceSubVariantJson[];
  sqFtHint?: string;
  estimatedTeam?: number;
  estimatedDurationMin?: number;
};

export type ServiceAddonJson = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  discountedPrice?: string;
  discountPercentage?: number;
  sortOrder: number;
  estimatedDurationMin?: number;
};

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  // legacy column — dropped by migration 20260519000002; default keeps inserts valid until then
  category: serviceCategoryEnum("category").notNull().default("QUICK_SHINE"),
  serviceType: text("service_type").notNull().default("B2C"),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  // legacy service-level pricingModel — pricing now lives per-variant in JSONB
  pricingModel: pricingModelEnum("pricing_model").notNull().default("FIXED"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  variants: jsonb("variants")
    .$type<ServiceVariantJson[]>()
    .notNull()
    .default([]),
  addons: jsonb("addons").$type<ServiceAddonJson[]>().notNull().default([]),
  inclusions: jsonb("inclusions")
    .$type<ServiceInclusionJson[]>()
    .notNull()
    .default([]),
  exclusions: jsonb("exclusions")
    .$type<ServiceInclusionJson[]>()
    .notNull()
    .default([]),
  ...timestamps,
});

export const quotationRequests = pgTable(
  "quotation_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id").references(() => services.id),
    variantId: uuid("variant_id"),
    consumerId: uuid("consumer_id").references(() => consumers.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    preferredTime: timestamp("preferred_time", {
      mode: "date",
      withTimezone: true,
    }),
    notes: text("notes"),
    quotedAmount: integer("quoted_amount"),
    status: quotationStatusEnum("status").default("PENDING").notNull(),
    ...timestamps,
  },
  (t) => [
    index("quotation_requests_consumer_id_idx").on(t.consumerId),
    index("quotation_requests_service_id_idx").on(t.serviceId),
  ],
);
