import {
  boolean,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./helpers.ts";
import { services } from "./services.ts";

export const incentiveConfigs = pgTable(
  "incentive_configs",
  {
    effectiveFrom: timestamp("effective_from", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    isActive: boolean("is_active").default(true).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "cascade",
    }),
    ...timestamps,
  },
  (t) => [
    index("incentive_configs_service_idx").on(t.serviceId),
    index("incentive_configs_active_idx").on(t.isActive),
  ],
);
