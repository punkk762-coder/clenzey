import { HttpStatusCode } from "axios";
import { and, eq, isNull, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import { incentiveConfigs } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type IncentiveConfigRecord = typeof incentiveConfigs.$inferSelect;
export type IncentiveConfigInsert = typeof incentiveConfigs.$inferInsert;

export const insertConfig = async (
  data: IncentiveConfigInsert,
): Promise<IncentiveConfigRecord> => {
  const [record] = await db.insert(incentiveConfigs).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create incentive config", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const updateConfig = async (
  id: string,
  patch: Partial<IncentiveConfigInsert>,
): Promise<IncentiveConfigRecord> => {
  const [record] = await db
    .update(incentiveConfigs)
    .set(patch)
    .where(eq(incentiveConfigs.id, id))
    .returning();
  if (!record) {
    throw new AppError("Failed to update incentive config", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findConfigById = async (
  id: string,
): Promise<IncentiveConfigRecord | null> => {
  const [row] = await db
    .select()
    .from(incentiveConfigs)
    .where(eq(incentiveConfigs.id, id))
    .limit(1);
  return row ?? null;
};

export const listConfigs = async (
  filter: { activeOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<IncentiveConfigRecord[]> => {
  const where = filter.activeOnly
    ? eq(incentiveConfigs.isActive, true)
    : undefined;
  return await db
    .select()
    .from(incentiveConfigs)
    .where(where)
    .orderBy(incentiveConfigs.createdAt)
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);
};

export const findActiveConfigByServiceId = async (
  serviceId: string,
): Promise<IncentiveConfigRecord | null> => {
  const [row] = await db
    .select()
    .from(incentiveConfigs)
    .where(
      and(
        eq(incentiveConfigs.serviceId, serviceId),
        eq(incentiveConfigs.isActive, true),
      ),
    )
    .orderBy(sql`${incentiveConfigs.effectiveFrom} DESC`)
    .limit(1);
  return row ?? null;
};

export const findActiveGlobalConfig =
  async (): Promise<IncentiveConfigRecord | null> => {
    const [row] = await db
      .select()
      .from(incentiveConfigs)
      .where(
        and(
          isNull(incentiveConfigs.serviceId),
          eq(incentiveConfigs.isActive, true),
        ),
      )
      .orderBy(sql`${incentiveConfigs.effectiveFrom} DESC`)
      .limit(1);
    return row ?? null;
  };
