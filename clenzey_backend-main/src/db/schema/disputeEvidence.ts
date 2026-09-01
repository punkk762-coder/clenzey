import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { disputes } from "./disputes.ts";
import { timestamps } from "./helpers.ts";

export const disputeEvidence = pgTable(
  "dispute_evidence",
  {
    disputeId: uuid("dispute_id")
      .notNull()
      .references(() => disputes.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    uploadedById: uuid("uploaded_by_id").notNull(),
    ...timestamps,
  },
  (t) => [index("dispute_evidence_dispute_id_idx").on(t.disputeId)],
);
