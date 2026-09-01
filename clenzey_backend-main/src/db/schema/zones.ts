import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { zoneStatusEnum, zoneTierEnum } from "./enums.ts";
import { geographyPolygon, timestamps } from "./helpers.ts";
import { services } from "./services.ts";

export const serviceZones = pgTable(
  "service_zones",
  {
    boundary: geographyPolygon("boundary").notNull(),
    centerLat: numeric("center_lat", { precision: 10, scale: 7 }),
    centerLng: numeric("center_lng", { precision: 10, scale: 7 }),
    city: text("city").notNull(),
    country: text("country").default("India").notNull(),
    description: text("description"),
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    priority: integer("priority").default(0).notNull(),
    slug: text("slug").notNull(),
    state: text("state").notNull(),
    status: zoneStatusEnum("status").default("DRAFT").notNull(),
    surgeMultiplier: numeric("surge_multiplier", { precision: 4, scale: 2 })
      .default("1.00")
      .notNull(),
    tier: zoneTierEnum("tier").default("STANDARD").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("service_zones_slug_idx").on(t.slug),
    index("service_zones_city_status_idx").on(t.city, t.status),
    index("service_zones_status_priority_idx").on(t.status, t.priority),
    // GIST index on boundary is created via raw SQL in migration:
    //   CREATE INDEX service_zones_boundary_gix ON service_zones USING GIST (boundary);
  ],
);

export const serviceZoneServices = pgTable(
  "service_zone_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isAvailable: boolean("is_available").default(true).notNull(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => serviceZones.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("service_zone_services_unique_idx").on(t.zoneId, t.serviceId),
    index("service_zone_services_service_idx").on(t.serviceId),
  ],
);

export const zonePriceOverrides = pgTable(
  "zone_price_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => serviceZones.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull(),
    overridePrice: numeric("override_price", { precision: 10, scale: 2 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("zone_price_overrides_unique_idx").on(t.zoneId, t.serviceId, t.variantId),
    index("zone_price_overrides_zone_idx").on(t.zoneId),
  ],
);
