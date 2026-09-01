import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { kycDocStatusEnum, kycDocumentTypeEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";
import { partners } from "./partners.ts";

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    documentType: kycDocumentTypeEnum("document_type").notNull(),
    fileUrl: text("file_url").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    rejectionReason: text("rejection_reason"),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true }),
    reviewedBy: uuid("reviewed_by"),
    status: kycDocStatusEnum("status").default("PENDING").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("kyc_documents_partner_type_unique").on(
      t.partnerId,
      t.documentType,
    ),
    index("kyc_documents_partner_idx").on(t.partnerId),
  ],
);
