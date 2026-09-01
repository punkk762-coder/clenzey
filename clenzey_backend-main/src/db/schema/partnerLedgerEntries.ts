import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookings } from "./bookings.ts";
import { ledgerEntryTypeEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";
import { reviews } from "./reviews.ts";

export type LedgerEntryMetadata = {
  absentDays?: number;
  baseSalary?: number;
  incentivePct?: number;
  subtotal?: number;
};

export const partnerLedgerEntries = pgTable(
  "partner_ledger_entries",
  {
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    earningDate: timestamp("earning_date", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    metadata: jsonb("metadata").$type<LedgerEntryMetadata>(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    payrollPeriod: text("payroll_period"),
    reviewId: uuid("review_id").references(() => reviews.id, {
      onDelete: "set null",
    }),
    type: ledgerEntryTypeEnum("type").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partner_ledger_entries_review_id_unique").on(t.reviewId),
    index("partner_ledger_entries_partner_id_idx").on(t.partnerId),
    index("partner_ledger_entries_earning_date_idx").on(t.earningDate),
    index("partner_ledger_entries_type_idx").on(t.type),
    index("partner_ledger_entries_payroll_period_idx").on(t.payrollPeriod),
  ],
);
