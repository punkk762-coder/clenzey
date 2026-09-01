const round2 = (value: number): number => Math.round(value * 100) / 100;

export const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

export const formatPayrollPeriod = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

export const parsePayrollPeriod = (
  period: string,
): { month: number; year: number } => {
  const [yearStr, monthStr] = period.split("-");
  return {
    month: Number(monthStr),
    year: Number(yearStr),
  };
};

export const getPreviousCalendarMonth = (
  referenceDate: Date,
): { month: number; year: number } => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
};

export type PayrollCalculationInput = {
  absentDays: number;
  month: number;
  monthlySalary: number;
  salaryEffectiveFrom?: Date | null;
  year: number;
};

export type PayrollCalculationResult = {
  absentDays: number;
  baseSalary: number;
  daysInMonth: number;
  deductionAmount: number;
  netSalary: number;
};

/**
 * Computes monthly salary with pro-rating for mid-month joiners and
 * absent-day deductions using calendar-day daily rate.
 */
export const calculateMonthlyPayroll = (
  input: PayrollCalculationInput,
): PayrollCalculationResult => {
  const daysInMonth = getDaysInMonth(input.year, input.month);
  const dailyRate = input.monthlySalary / daysInMonth;

  let baseSalary = input.monthlySalary;

  if (input.salaryEffectiveFrom) {
    const effectiveYear = input.salaryEffectiveFrom.getFullYear();
    const effectiveMonth = input.salaryEffectiveFrom.getMonth() + 1;

    if (
      effectiveYear > input.year ||
      (effectiveYear === input.year && effectiveMonth > input.month)
    ) {
      return {
        absentDays: input.absentDays,
        baseSalary: 0,
        daysInMonth,
        deductionAmount: 0,
        netSalary: 0,
      };
    }

    if (effectiveYear === input.year && effectiveMonth === input.month) {
      const startDay = input.salaryEffectiveFrom.getDate();
      const activeDays = daysInMonth - startDay + 1;
      baseSalary = round2(dailyRate * activeDays);
    }
  }

  const cappedAbsentDays = Math.min(input.absentDays, daysInMonth);
  const deductionAmount = round2(dailyRate * cappedAbsentDays);
  const netSalary = round2(Math.max(baseSalary - deductionAmount, 0));

  return {
    absentDays: cappedAbsentDays,
    baseSalary: round2(baseSalary),
    daysInMonth,
    deductionAmount,
    netSalary,
  };
};

export const calculateIncentiveAmount = (
  subtotal: number,
  percentage: number,
): number => round2((subtotal * percentage) / 100);
