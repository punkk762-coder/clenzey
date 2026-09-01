import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { consumers } from "./consumers.ts";
import { timestamps } from "./helpers.ts";
import { coupons } from "./pricing.ts";

export const referrals = pgTable(
  "referrals",
  {
    appliedAt: timestamp("applied_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    refereeCouponId: uuid("referee_coupon_id").references(() => coupons.id, {
      onDelete: "set null",
    }),
    refereeId: uuid("referee_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    referralCode: text("referral_code").notNull(),
    referrerCouponId: uuid("referrer_coupon_id").references(() => coupons.id, {
      onDelete: "set null",
    }),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("referrals_referee_id_idx").on(t.refereeId),
    index("referrals_referrer_id_idx").on(t.referrerId),
  ],
);
