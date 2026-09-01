import {
  boolean,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./helpers.ts";

/**
 * Global platform pricing knobs (GST + platform fee) applied to every service.
 * Stored as versioned rows: the most recent `is_active` row is the effective
 * configuration. Rates are persisted as percentages (0–100) for GST /
 * platform-fee-percent and an absolute currency amount for the flat fee.
 */
export const platformPricingSettings = pgTable(
  "platform_pricing_settings",
  {
    effectiveFrom: timestamp("effective_from", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    isActive: boolean("is_active").default(true).notNull(),
    platformFeeFlat: numeric("platform_fee_flat", {
      precision: 10,
      scale: 2,
    }).notNull(),
    platformFeePercent: numeric("platform_fee_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("platform_pricing_settings_active_idx").on(t.isActive),
    index("platform_pricing_settings_effective_idx").on(t.effectiveFrom),
  ],
);
