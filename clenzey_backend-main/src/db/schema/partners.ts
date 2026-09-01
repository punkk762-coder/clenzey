import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { approvalStatusEnum, genderEnum, kycStatusEnum } from "./enums.ts";
import { geographyPoint, timestamps } from "./helpers.ts";
import { users } from "./users.ts";

export const partners = pgTable(
  "partners",
  {
    approvalDate: timestamp("approval_date", {
      mode: "date",
      withTimezone: true,
    }),
    approvalRejectionReason: text("approval_rejection_reason"),
    approvalStatus: approvalStatusEnum("approval_status")
      .default("PENDING")
      .notNull(),
    approvedBy: uuid("approved_by"),
    avgRating: numeric("avg_rating", { precision: 3, scale: 2 }),
    baseLocation: geographyPoint("base_location"),
    bio: text("bio"),
    dob: date("dob", { mode: "date" }),
    experienceYears: integer("experience_years"),
    fullName: text("full_name"),
    gender: genderEnum("gender"),
    id: uuid("id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").default(true).notNull(),
    kycStatus: kycStatusEnum("kyc_status").default("PENDING").notNull(),
    isPayrollActive: boolean("is_payroll_active").default(true).notNull(),
    languages: text("languages").array().default([]).notNull(),
    monthlySalary: numeric("monthly_salary", { precision: 10, scale: 2 }),
    profileImage: text("profile_image"),
    salaryEffectiveFrom: date("salary_effective_from", { mode: "date" }),
    totalReviews: integer("total_reviews").default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    index("partners_approval_status_is_available_idx").on(
      t.approvalStatus,
      t.isAvailable,
    ),
  ],
);
