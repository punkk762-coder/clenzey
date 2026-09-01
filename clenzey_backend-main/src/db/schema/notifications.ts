import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { notificationChannelEnum, userTypeEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const notifications = pgTable(
  "notifications",
  {
    body: text("body").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    metadata: jsonb("metadata"),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    recipientId: uuid("recipient_id").notNull(),
    recipientType: userTypeEnum("recipient_type").notNull(),
    title: text("title").notNull(),
    ...timestamps,
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.recipientType),
    index("notifications_read_at_idx").on(t.readAt),
    index("notifications_created_at_idx").on(t.createdAt),
  ],
);
