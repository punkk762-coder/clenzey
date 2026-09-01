import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { adminRoleEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const admins = pgTable("admins", {
  email: text("email").unique(),
  id: uuid("id").primaryKey().defaultRandom(),
  isActive: boolean("is_active").default(true).notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").unique().notNull(),
  role: adminRoleEnum("role").notNull().default("SUPPORT"),
  username: text("username").unique().notNull(),
  ...timestamps,
});
