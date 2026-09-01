import {
  index,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { attendanceSourceEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";

export const partnerMonthlyAttendance = pgTable(
  "partner_monthly_attendance",
  {
    absentDays: integer("absent_days").default(0).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    month: integer("month").notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    source: attendanceSourceEnum("source").default("ADMIN").notNull(),
    year: integer("year").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partner_monthly_attendance_partner_period_unique").on(
      t.partnerId,
      t.year,
      t.month,
    ),
    index("partner_monthly_attendance_period_idx").on(t.year, t.month),
  ],
);
