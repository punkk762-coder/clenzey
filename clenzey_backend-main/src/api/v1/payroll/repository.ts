import { HttpStatusCode } from "axios";
import { and, eq, gt, isNotNull } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  partnerMonthlyAttendance,
  partnerPayrollRuns,
  partners,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type PayrollRunRecord = typeof partnerPayrollRuns.$inferSelect;
export type AttendanceRecord = typeof partnerMonthlyAttendance.$inferSelect;

export const findPayrollRun = async (
  partnerId: string,
  payrollPeriod: string,
): Promise<PayrollRunRecord | null> => {
  const [row] = await db
    .select()
    .from(partnerPayrollRuns)
    .where(
      and(
        eq(partnerPayrollRuns.partnerId, partnerId),
        eq(partnerPayrollRuns.payrollPeriod, payrollPeriod),
      ),
    )
    .limit(1);
  return row ?? null;
};

export const insertPayrollRun = async (
  data: typeof partnerPayrollRuns.$inferInsert,
): Promise<PayrollRunRecord> => {
  const [record] = await db.insert(partnerPayrollRuns).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create payroll run", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const updatePayrollRun = async (
  id: string,
  patch: Partial<typeof partnerPayrollRuns.$inferInsert>,
): Promise<PayrollRunRecord> => {
  const [record] = await db
    .update(partnerPayrollRuns)
    .set(patch)
    .where(eq(partnerPayrollRuns.id, id))
    .returning();
  if (!record) {
    throw new AppError("Failed to update payroll run", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const listPayrollRuns = async (filters: {
  limit?: number;
  offset?: number;
  partnerId?: string;
  payrollPeriod?: string;
  status?: PayrollRunRecord["status"];
}): Promise<{ runs: PayrollRunRecord[]; total: number }> => {
  const conditions = [];
  if (filters.partnerId) {
    conditions.push(eq(partnerPayrollRuns.partnerId, filters.partnerId));
  }
  if (filters.payrollPeriod) {
    conditions.push(eq(partnerPayrollRuns.payrollPeriod, filters.payrollPeriod));
  }
  if (filters.status) {
    conditions.push(eq(partnerPayrollRuns.status, filters.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const runs = await db
    .select()
    .from(partnerPayrollRuns)
    .where(where)
    .orderBy(partnerPayrollRuns.payrollPeriod)
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ id: partnerPayrollRuns.id })
    .from(partnerPayrollRuns)
    .where(where);

  return { runs, total: countRows.length };
};

export const listPayrollEligiblePartners = async () => {
  return await db
    .select()
    .from(partners)
    .where(
      and(
        eq(partners.isPayrollActive, true),
        isNotNull(partners.monthlySalary),
        gt(partners.monthlySalary, "0"),
      ),
    );
};

export const findPartnerById = async (partnerId: string) => {
  const [row] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  return row ?? null;
};

export const updatePartnerSalary = async (
  partnerId: string,
  patch: {
    isPayrollActive?: boolean;
    monthlySalary?: string | null;
    salaryEffectiveFrom?: Date | null;
  },
) => {
  const [record] = await db
    .update(partners)
    .set(patch)
    .where(eq(partners.id, partnerId))
    .returning();
  if (!record) {
    throw new AppError("Failed to update partner salary", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const upsertAttendance = async (input: {
  absentDays: number;
  month: number;
  partnerId: string;
  source: AttendanceRecord["source"];
  year: number;
}): Promise<AttendanceRecord> => {
  const [record] = await db
    .insert(partnerMonthlyAttendance)
    .values({
      absentDays: input.absentDays,
      month: input.month,
      partnerId: input.partnerId,
      source: input.source,
      year: input.year,
    })
    .onConflictDoUpdate({
      set: {
        absentDays: input.absentDays,
        source: input.source,
        updatedAt: new Date(),
      },
      target: [
        partnerMonthlyAttendance.partnerId,
        partnerMonthlyAttendance.year,
        partnerMonthlyAttendance.month,
      ],
    })
    .returning();
  if (!record) {
    throw new AppError("Failed to upsert attendance", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findAttendance = async (
  partnerId: string,
  year: number,
  month: number,
): Promise<AttendanceRecord | null> => {
  const [row] = await db
    .select()
    .from(partnerMonthlyAttendance)
    .where(
      and(
        eq(partnerMonthlyAttendance.partnerId, partnerId),
        eq(partnerMonthlyAttendance.year, year),
        eq(partnerMonthlyAttendance.month, month),
      ),
    )
    .limit(1);
  return row ?? null;
};
