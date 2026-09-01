import {
  boolean,
  index,
  pgTable,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";
import { serviceZones } from "./zones.ts";

export const partnerZones = pgTable(
  "partner_zones",
  {
    isPrimary: boolean("is_primary").default(false).notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => serviceZones.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.partnerId, t.zoneId] }),
    index("partner_zones_zone_id_idx").on(t.zoneId),
  ],
);
