import { HttpStatusCode } from "axios";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  partnerLedgerEntries,
  payouts,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import {
  normalizeAvailableBalance,
  parseMoney,
} from "../../../utilities/moneyUtils.ts";

export type LedgerEntryRecord = typeof partnerLedgerEntries.$inferSelect;
export type LedgerEntryInsert = typeof partnerLedgerEntries.$inferInsert;

export const insertLedgerEntry = async (
  data: LedgerEntryInsert,
): Promise<LedgerEntryRecord> => {
  const [record] = await db
    .insert(partnerLedgerEntries)
    .values(data)
    .returning();
  if (!record) {
    throw new AppError("Failed to create ledger entry", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findLedgerEntryByReviewId = async (
  reviewId: string,
): Promise<LedgerEntryRecord | null> => {
  const [row] = await db
    .select()
    .from(partnerLedgerEntries)
    .where(eq(partnerLedgerEntries.reviewId, reviewId))
    .limit(1);
  return row ?? null;
};

export type LedgerSummary = {
  currentBalance: number;
  totalDeductions: number;
  totalIncentives: number;
  totalPayouts: number;
  totalSalary: number;
};

type LedgerTotals = Pick<
  LedgerSummary,
  "totalDeductions" | "totalIncentives" | "totalSalary"
>;

const sumLedgerTotals = async (
  partnerId: string,
  dateRange?: { from: Date; to: Date },
): Promise<LedgerTotals> => {
  const conditions = [eq(partnerLedgerEntries.partnerId, partnerId)];
  if (dateRange) {
    conditions.push(gte(partnerLedgerEntries.earningDate, dateRange.from));
    conditions.push(lte(partnerLedgerEntries.earningDate, dateRange.to));
  }

  const [ledgerResult] = await db
    .select({
      totalDeductions: sql<string>`COALESCE(SUM(CASE WHEN ${partnerLedgerEntries.type} = 'SALARY_DEDUCTION' THEN ${partnerLedgerEntries.amount}::numeric ELSE 0 END), 0)`,
      totalIncentives: sql<string>`COALESCE(SUM(CASE WHEN ${partnerLedgerEntries.type} = 'INCENTIVE' THEN ${partnerLedgerEntries.amount}::numeric ELSE 0 END), 0)`,
      totalSalary: sql<string>`COALESCE(SUM(CASE WHEN ${partnerLedgerEntries.type} = 'SALARY' THEN ${partnerLedgerEntries.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(partnerLedgerEntries)
    .where(and(...conditions));

  return {
    totalDeductions: parseMoney(ledgerResult?.totalDeductions ?? "0"),
    totalIncentives: parseMoney(ledgerResult?.totalIncentives ?? "0"),
    totalSalary: parseMoney(ledgerResult?.totalSalary ?? "0"),
  };
};

const sumPayouts = async (
  partnerId: string,
  dateRange?: { from: Date; to: Date },
): Promise<number> => {
  const conditions = [
    eq(payouts.partnerId, partnerId),
    inArray(payouts.status, ["PENDING", "PROCESSING", "PAID"]),
  ];
  if (dateRange) {
    conditions.push(gte(payouts.createdAt, dateRange.from));
    conditions.push(lte(payouts.createdAt, dateRange.to));
  }

  const [payoutsResult] = await db
    .select({
      totalPayouts: sql<string>`COALESCE(SUM(${payouts.amount}::numeric), 0)`,
    })
    .from(payouts)
    .where(and(...conditions));

  return parseMoney(payoutsResult?.totalPayouts ?? "0");
};

export const getLedgerSummary = async (
  partnerId: string,
  dateRange?: { from: Date; to: Date },
): Promise<LedgerSummary> => {
  if (!dateRange) {
    const [lifetimeTotals, lifetimePayouts] = await Promise.all([
      sumLedgerTotals(partnerId),
      sumPayouts(partnerId),
    ]);

    return {
      currentBalance: normalizeAvailableBalance(
        lifetimeTotals.totalSalary +
          lifetimeTotals.totalIncentives -
          lifetimeTotals.totalDeductions -
          lifetimePayouts,
      ),
      totalDeductions: lifetimeTotals.totalDeductions,
      totalIncentives: lifetimeTotals.totalIncentives,
      totalPayouts: lifetimePayouts,
      totalSalary: lifetimeTotals.totalSalary,
    };
  }

  const [periodTotals, periodPayouts, lifetimeTotals, lifetimePayouts] =
    await Promise.all([
      sumLedgerTotals(partnerId, dateRange),
      sumPayouts(partnerId, dateRange),
      sumLedgerTotals(partnerId),
      sumPayouts(partnerId),
    ]);

  return {
    currentBalance: normalizeAvailableBalance(
      lifetimeTotals.totalSalary +
        lifetimeTotals.totalIncentives -
        lifetimeTotals.totalDeductions -
        lifetimePayouts,
    ),
    totalDeductions: periodTotals.totalDeductions,
    totalIncentives: periodTotals.totalIncentives,
    totalPayouts: periodPayouts,
    totalSalary: periodTotals.totalSalary,
  };
};

export const listLedgerEntries = async (
  partnerId: string,
  opts: { limit?: number; offset?: number },
): Promise<{ entries: LedgerEntryRecord[]; total: number }> => {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(partnerLedgerEntries)
      .where(eq(partnerLedgerEntries.partnerId, partnerId))
      .orderBy(desc(partnerLedgerEntries.earningDate))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(partnerLedgerEntries)
      .where(eq(partnerLedgerEntries.partnerId, partnerId)),
  ]);

  return {
    entries: rows,
    total: totalResult[0]?.count ?? 0,
  };
};

export const getPayrollBreakdown = async (
  partnerId: string,
  payrollPeriod: string,
): Promise<{
  deductions: LedgerEntryRecord[];
  incentives: LedgerEntryRecord[];
  salary: LedgerEntryRecord | null;
}> => {
  const rows = await db
    .select()
    .from(partnerLedgerEntries)
    .where(
      and(
        eq(partnerLedgerEntries.partnerId, partnerId),
        sql`(${partnerLedgerEntries.payrollPeriod} = ${payrollPeriod} OR (${partnerLedgerEntries.type} = 'INCENTIVE' AND to_char(${partnerLedgerEntries.earningDate} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = ${payrollPeriod}))`,
      ),
    )
    .orderBy(desc(partnerLedgerEntries.earningDate));

  return {
    deductions: rows.filter((row) => row.type === "SALARY_DEDUCTION"),
    incentives: rows.filter((row) => row.type === "INCENTIVE"),
    salary: rows.find((row) => row.type === "SALARY") ?? null,
  };
};

export const insertPayout = async (
  data: typeof payouts.$inferInsert,
): Promise<typeof payouts.$inferSelect> => {
  const [record] = await db.insert(payouts).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create payout record", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const listPayouts = async (
  filters: {
    limit?: number;
    offset?: number;
    partnerId?: string;
    status?: string;
  } = {},
): Promise<{ payouts: (typeof payouts.$inferSelect)[]; total: number }> => {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const conditions = [];

  if (filters.partnerId) {
    conditions.push(eq(payouts.partnerId, filters.partnerId));
  }
  if (filters.status) {
    conditions.push(
      eq(payouts.status, filters.status as (typeof payouts.$inferSelect)["status"]),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(payouts)
      .where(where)
      .orderBy(desc(payouts.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(payouts).where(where),
  ]);

  return {
    payouts: rows,
    total: totalResult[0]?.count ?? 0,
  };
};

export const updatePayoutStatus = async (
  payoutId: string,
  status: (typeof payouts.$inferSelect)["status"],
  paidAt?: Date,
): Promise<typeof payouts.$inferSelect> => {
  const patch: Partial<typeof payouts.$inferInsert> = { status };
  if (status === "PAID" && paidAt) {
    patch.paidAt = paidAt;
  }
  const [record] = await db
    .update(payouts)
    .set(patch)
    .where(eq(payouts.id, payoutId))
    .returning();
  if (!record) {
    throw new AppError("Failed to update payout status", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const getAvailableBalance = async (partnerId: string): Promise<number> => {
  const summary = await getLedgerSummary(partnerId);
  return summary.currentBalance;
};

export const getTotalIncentivesForDateRange = async (
  from: Date,
  to: Date,
): Promise<number> => {
  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${partnerLedgerEntries.amount}::numeric), 0)`,
    })
    .from(partnerLedgerEntries)
    .where(
      and(
        eq(partnerLedgerEntries.type, "INCENTIVE"),
        gte(partnerLedgerEntries.earningDate, from),
        lte(partnerLedgerEntries.earningDate, to),
      ),
    );
  return parseFloat(result?.total ?? "0");
};

export const deletePayrollLedgerEntries = async (
  partnerId: string,
  payrollPeriod: string,
): Promise<void> => {
  await db
    .delete(partnerLedgerEntries)
    .where(
      and(
        eq(partnerLedgerEntries.partnerId, partnerId),
        eq(partnerLedgerEntries.payrollPeriod, payrollPeriod),
        inArray(partnerLedgerEntries.type, ["SALARY", "SALARY_DEDUCTION"]),
      ),
    );
};
