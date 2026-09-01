import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { payrollRunStatusEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";

export const partnerPayrollRuns = pgTable(
  "partner_payroll_runs",
  {
    absentDays: integer("absent_days").default(0).notNull(),
    baseSalary: numeric("base_salary", { precision: 10, scale: 2 }).notNull(),
    deductionAmount: numeric("deduction_amount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    id: uuid("id").primaryKey().defaultRandom(),
    netSalary: numeric("net_salary", { precision: 10, scale: 2 }).notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    payrollPeriod: text("payroll_period").notNull(),
    processedAt: timestamp("processed_at", {
      mode: "date",
      withTimezone: true,
    }),
    status: payrollRunStatusEnum("status").default("PENDING").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partner_payroll_runs_partner_period_unique").on(
      t.partnerId,
      t.payrollPeriod,
    ),
    index("partner_payroll_runs_status_idx").on(t.status),
    index("partner_payroll_runs_payroll_period_idx").on(t.payrollPeriod),
  ],
);
