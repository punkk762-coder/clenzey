import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./helpers.ts";

export const users = pgTable("users", {
  email: text("email").unique(),
  id: uuid("id").primaryKey().defaultRandom(),
  isActive: boolean("is_active").default(true).notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone").unique().notNull(),
  ...timestamps,
});
