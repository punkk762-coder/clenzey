import { HttpStatusCode } from "axios";
import { eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { platformPricingSettings } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type PlatformPricingSettingsInsert =
  typeof platformPricingSettings.$inferInsert;
export type PlatformPricingSettingsRecord =
  typeof platformPricingSettings.$inferSelect;

export const findActiveSettings =
  async (): Promise<null | PlatformPricingSettingsRecord> => {
    const [row] = await db
      .select()
      .from(platformPricingSettings)
      .where(eq(platformPricingSettings.isActive, true))
      .orderBy(sql`${platformPricingSettings.effectiveFrom} DESC`)
      .limit(1);
    return row ?? null;
  };

export const listSettings = async (filter: {
  limit?: number;
  offset?: number;
}): Promise<PlatformPricingSettingsRecord[]> => {
  return await db
    .select()
    .from(platformPricingSettings)
    .orderBy(sql`${platformPricingSettings.effectiveFrom} DESC`)
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);
};

/**
 * Persists a new active configuration version and deactivates every prior row
 * in a single transaction, guaranteeing exactly one active row.
 */
export const publishSettings = async (
  data: PlatformPricingSettingsInsert,
): Promise<PlatformPricingSettingsRecord> => {
  return await db.transaction(async (tx) => {
    await tx
      .update(platformPricingSettings)
      .set({ isActive: false })
      .where(eq(platformPricingSettings.isActive, true));

    const [record] = await tx
      .insert(platformPricingSettings)
      .values({ ...data, isActive: true })
      .returning();

    if (!record) {
      throw new AppError("Failed to save platform pricing settings", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }
    return record;
  });
};
