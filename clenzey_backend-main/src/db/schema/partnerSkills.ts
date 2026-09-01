import { index, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";
import { services } from "./services.ts";

export const partnerSkills = pgTable(
  "partner_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partner_skills_unique").on(t.partnerId, t.serviceId),
    index("partner_skills_service_idx").on(t.serviceId),
  ],
);
