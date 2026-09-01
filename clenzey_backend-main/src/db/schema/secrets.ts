import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { userTypeEnum } from "./enums.ts";

export const secrets = pgTable("secrets", {
  consumedAt: timestamp("consumed_at", { mode: "date", withTimezone: true }),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  id: uuid("id").primaryKey().defaultRandom(),
  isUsed: boolean("is_used").default(false).notNull(),
  phone: text("phone").notNull(),
  token: text("token").unique().notNull(),
  userType: userTypeEnum("user_type").notNull(),
});
