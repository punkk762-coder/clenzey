import { NotFoundError } from "../../../errors/appErrors.ts";
import logger from "../../../configs/loggerConfig.ts";
import {
  calculateMonthlyPayroll,
  formatPayrollPeriod,
  getPreviousCalendarMonth,
  parsePayrollPeriod,
} from "../../../utilities/payrollUtils.ts";
import { createLedgerEntry } from "../earnings/service.ts";
import * as repo from "./repository.ts";

export type PartnerSalaryConfig = {
  isPayrollActive: boolean;
  monthlySalary: number | null;
  partnerId: string;
  salaryEffectiveFrom: Date | null;
};

export const getPartnerSalary = async (
  partnerId: string,
): Promise<PartnerSalaryConfig> => {
  const partner = await repo.findPartnerById(partnerId);
  if (!partner) throw new NotFoundError("Partner not found.");

  return {
    isPayrollActive: partner.isPayrollActive,
    monthlySalary: partner.monthlySalary
      ? parseFloat(partner.monthlySalary)
      : null,
    partnerId: partner.id,
    salaryEffectiveFrom: partner.salaryEffectiveFrom ?? null,
  };
};

export const setPartnerSalary = async (
  partnerId: string,
  input: {
    isPayrollActive?: boolean;
    monthlySalary: number;
    salaryEffectiveFrom?: string;
  },
) => {
  const partner = await repo.findPartnerById(partnerId);
  if (!partner) throw new NotFoundError("Partner not found.");

  return await repo.updatePartnerSalary(partnerId, {
    isPayrollActive: input.isPayrollActive ?? partner.isPayrollActive,
    monthlySalary: String(input.monthlySalary),
    salaryEffectiveFrom: input.salaryEffectiveFrom
      ? new Date(input.salaryEffectiveFrom)
      : partner.salaryEffectiveFrom,
  });
};

export const setPartnerAttendance = async (input: {
  absentDays: number;
  partnerId: string;
  period: string;
  source: "ADMIN" | "ATTENDANCE_SYSTEM";
}) => {
  const partner = await repo.findPartnerById(input.partnerId);
  if (!partner) throw new NotFoundError("Partner not found.");

  const { month, year } = parsePayrollPeriod(input.period);
  return await repo.upsertAttendance({
    absentDays: input.absentDays,
    month,
    partnerId: input.partnerId,
    source: input.source,
    year,
  });
};

export const processPartnerPayroll = async (input: {
  force?: boolean;
  partnerId: string;
  payrollPeriod: string;
}) => {
  const existing = await repo.findPayrollRun(input.partnerId, input.payrollPeriod);
  if (existing?.status === "PROCESSED" && !input.force) {
    return existing;
  }

  if (input.force && existing) {
    const { deletePayrollLedgerEntries } = await import(
      "../earnings/repository.ts"
    );
    await deletePayrollLedgerEntries(input.partnerId, input.payrollPeriod);
  }

  const partner = await repo.findPartnerById(input.partnerId);
  if (!partner) throw new NotFoundError("Partner not found.");

  const monthlySalary = partner.monthlySalary
    ? parseFloat(partner.monthlySalary)
    : 0;
  if (!partner.isPayrollActive || monthlySalary <= 0) {
    throw new NotFoundError("Partner is not configured for payroll.");
  }

  const { month, year } = parsePayrollPeriod(input.payrollPeriod);
  const attendance = await repo.findAttendance(input.partnerId, year, month);
  const absentDays = attendance?.absentDays ?? 0;

  const payroll = calculateMonthlyPayroll({
    absentDays,
    month,
    monthlySalary,
    salaryEffectiveFrom: partner.salaryEffectiveFrom ?? null,
    year,
  });

  if (payroll.baseSalary <= 0) {
    const run = existing
      ? await repo.updatePayrollRun(existing.id, {
          absentDays: payroll.absentDays,
          baseSalary: "0",
          deductionAmount: "0",
          netSalary: "0",
          processedAt: new Date(),
          status: "PROCESSED",
        })
      : await repo.insertPayrollRun({
          absentDays: payroll.absentDays,
          baseSalary: "0",
          deductionAmount: "0",
          netSalary: "0",
          partnerId: input.partnerId,
          payrollPeriod: input.payrollPeriod,
          processedAt: new Date(),
          status: "PROCESSED",
        });
    return run;
  }

  const earningDate = new Date();

  await createLedgerEntry({
    amount: payroll.baseSalary,
    description: `Monthly salary for ${input.payrollPeriod}`,
    earningDate,
    metadata: {
      absentDays: payroll.absentDays,
      baseSalary: payroll.baseSalary,
    },
    partnerId: input.partnerId,
    payrollPeriod: input.payrollPeriod,
    type: "SALARY",
  });

  if (payroll.deductionAmount > 0) {
    await createLedgerEntry({
      amount: payroll.deductionAmount,
      description: `Absent day deduction for ${input.payrollPeriod}`,
      earningDate,
      metadata: {
        absentDays: payroll.absentDays,
        baseSalary: payroll.baseSalary,
      },
      partnerId: input.partnerId,
      payrollPeriod: input.payrollPeriod,
      type: "SALARY_DEDUCTION",
    });
  }

  const run = existing
    ? await repo.updatePayrollRun(existing.id, {
        absentDays: payroll.absentDays,
        baseSalary: String(payroll.baseSalary),
        deductionAmount: String(payroll.deductionAmount),
        netSalary: String(payroll.netSalary),
        processedAt: new Date(),
        status: "PROCESSED",
      })
    : await repo.insertPayrollRun({
        absentDays: payroll.absentDays,
        baseSalary: String(payroll.baseSalary),
        deductionAmount: String(payroll.deductionAmount),
        netSalary: String(payroll.netSalary),
        partnerId: input.partnerId,
        payrollPeriod: input.payrollPeriod,
        processedAt: new Date(),
        status: "PROCESSED",
      });

  return run;
};

export const runMonthlyPayrollBatch = async (
  referenceDate: Date = new Date(),
): Promise<{ failed: number; processed: number; skipped: number }> => {
  const { month, year } = getPreviousCalendarMonth(referenceDate);
  const payrollPeriod = formatPayrollPeriod(year, month);

  const eligiblePartners = await repo.listPayrollEligiblePartners();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const partner of eligiblePartners) {
    try {
      const existing = await repo.findPayrollRun(partner.id, payrollPeriod);
      if (existing?.status === "PROCESSED") {
        skipped += 1;
        continue;
      }

      await processPartnerPayroll({
        partnerId: partner.id,
        payrollPeriod,
      });
      processed += 1;
    } catch (error) {
      failed += 1;
      logger.error("Payroll processing failed for partner", {
        error: error instanceof Error ? error.message : String(error),
        partnerId: partner.id,
        payrollPeriod,
      });
    }
  }

  logger.info("Monthly payroll batch completed", {
    failed,
    payrollPeriod,
    processed,
    skipped,
  });

  return { failed, processed, skipped };
};

export const listPayrollRuns = repo.listPayrollRuns;

export const reprocessPayroll = async (input: {
  partnerId: string;
  payrollPeriod: string;
}) => {
  return await processPartnerPayroll({
    force: true,
    partnerId: input.partnerId,
    payrollPeriod: input.payrollPeriod,
  });
};
