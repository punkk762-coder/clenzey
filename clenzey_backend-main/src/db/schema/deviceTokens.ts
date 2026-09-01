import {
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { devicePlatformEnum, userTypeEnum } from "./enums.ts";
import { timestamps } from "./helpers.ts";

export const deviceTokens = pgTable(
  "device_tokens",
  {
    deviceToken: text("device_token").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    platform: devicePlatformEnum("platform").notNull(),
    userId: uuid("user_id").notNull(),
    userType: userTypeEnum("user_type").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("device_tokens_token_unique").on(t.deviceToken),
    index("device_tokens_user_idx").on(t.userId),
  ],
);
