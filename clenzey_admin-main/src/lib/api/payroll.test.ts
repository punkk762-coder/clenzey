import { describe, expect, it } from "vitest";

import { mapPartnerSalary, mapPayrollRun } from "./payroll";

describe("payroll mappers", () => {
  it("maps backend payroll run salary fields to UI amounts", () => {
    expect(
      mapPayrollRun({
        id: "run-1",
        partnerId: "partner-1",
        payrollPeriod: "2026-06",
        status: "PROCESSED",
        baseSalary: "25000.00",
        netSalary: "23000.00",
        deductionAmount: "2000.00",
        absentDays: 2,
        processedAt: "2026-07-01T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toEqual({
      id: "run-1",
      partnerId: "partner-1",
      payrollPeriod: "2026-06",
      status: "PROCESSED",
      grossAmount: "25000",
      netAmount: "23000",
      deductionAmount: "2000",
      absentDays: 2,
      processedAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("maps backend partner salary config", () => {
    expect(
      mapPartnerSalary({
        monthlySalary: 18000,
        isPayrollActive: true,
        salaryEffectiveFrom: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      monthlySalary: 18000,
      isPayrollActive: true,
      salaryEffectiveFrom: "2026-01-01T00:00:00.000Z",
    });
  });
});
