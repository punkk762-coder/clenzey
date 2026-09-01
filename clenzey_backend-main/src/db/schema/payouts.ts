import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { payoutStatusEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";

export type PayoutBreakdown = {
  deductions?: number;
  incentives?: number;
  salary?: number;
};

export const payouts = pgTable(
  "payouts",
  {
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    breakdown: jsonb("breakdown").$type<PayoutBreakdown>(),
    id: uuid("id").primaryKey().defaultRandom(),
    initiatedBy: uuid("initiated_by").notNull(),
    notes: text("notes"),
    paidAt: timestamp("paid_at", { mode: "date", withTimezone: true }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    periodEnd: timestamp("period_end", { mode: "date", withTimezone: true }),
    periodStart: timestamp("period_start", { mode: "date", withTimezone: true }),
    status: payoutStatusEnum("status").default("PENDING").notNull(),
    ...timestamps,
  },
  (t) => [
    index("payouts_partner_id_idx").on(t.partnerId),
    index("payouts_status_idx").on(t.status),
  ],
);
