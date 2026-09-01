import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";

export const bankDetails = pgTable(
  "bank_details",
  {
    accountHolderName: text("account_holder_name").notNull(),
    accountNumber: text("account_number").notNull(),
    bankName: text("bank_name").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    ifscCode: text("ifsc_code").notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("bank_details_partner_unique").on(t.partnerId)],
);
