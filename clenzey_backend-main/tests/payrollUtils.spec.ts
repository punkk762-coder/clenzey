import { describe, expect, it } from "vitest";

import {
  calculateIncentiveAmount,
  calculateMonthlyPayroll,
  formatPayrollPeriod,
  getDaysInMonth,
  getPreviousCalendarMonth,
  parsePayrollPeriod,
} from "../src/utilities/payrollUtils.ts";

describe("payrollUtils", () => {
  it("calculates full month salary with no absences", () => {
    const result = calculateMonthlyPayroll({
      absentDays: 0,
      month: 6,
      monthlySalary: 30000,
      year: 2026,
    });

    expect(result.baseSalary).toBe(30000);
    expect(result.deductionAmount).toBe(0);
    expect(result.netSalary).toBe(30000);
    expect(result.daysInMonth).toBe(30);
  });

  it("deducts absent days using calendar-day daily rate", () => {
    const result = calculateMonthlyPayroll({
      absentDays: 3,
      month: 6,
      monthlySalary: 30000,
      year: 2026,
    });

    expect(result.deductionAmount).toBe(3000);
    expect(result.netSalary).toBe(27000);
  });

  it("pro-rates salary when partner joins mid-month", () => {
    const result = calculateMonthlyPayroll({
      absentDays: 0,
      month: 6,
      monthlySalary: 30000,
      salaryEffectiveFrom: new Date("2026-06-16"),
      year: 2026,
    });

    expect(result.baseSalary).toBe(15000);
    expect(result.netSalary).toBe(15000);
  });

  it("returns zero salary before effective date month", () => {
    const result = calculateMonthlyPayroll({
      absentDays: 0,
      month: 5,
      monthlySalary: 30000,
      salaryEffectiveFrom: new Date("2026-06-01"),
      year: 2026,
    });

    expect(result.baseSalary).toBe(0);
    expect(result.netSalary).toBe(0);
  });

  it("calculates incentive as percentage of subtotal", () => {
    expect(calculateIncentiveAmount(500, 20)).toBe(100);
    expect(calculateIncentiveAmount(249.5, 20)).toBe(49.9);
  });

  it("formats payroll period and resolves previous month", () => {
    expect(formatPayrollPeriod(2026, 6)).toBe("2026-06");
    expect(getDaysInMonth(2026, 2)).toBe(28);
    expect(getPreviousCalendarMonth(new Date("2026-06-03T00:00:00+05:30"))).toEqual({
      month: 5,
      year: 2026,
    });
  });

  it("parses payroll period strings", () => {
    expect(parsePayrollPeriod("2026-06")).toEqual({ month: 6, year: 2026 });
  });

  it("returns December of previous year when reference is January", () => {
    expect(getPreviousCalendarMonth(new Date("2026-01-15T00:00:00+05:30"))).toEqual({
      month: 12,
      year: 2025,
    });
  });

  it("caps absent days at days in month", () => {
    const result = calculateMonthlyPayroll({
      absentDays: 40,
      month: 6,
      monthlySalary: 30000,
      year: 2026,
    });

    expect(result.absentDays).toBe(30);
    expect(result.deductionAmount).toBe(30000);
    expect(result.netSalary).toBe(0);
  });
});
