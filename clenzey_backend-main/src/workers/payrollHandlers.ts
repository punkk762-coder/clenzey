import { getIstParts } from "../utilities/timezoneUtils.ts";
import * as payrollService from "../api/v1/payroll/service.ts";

export const shouldRunPayrollToday = (date: Date = new Date()): boolean => {
  const { day } = getIstParts(date);
  return day >= 1 && day <= 5;
};

export const runPayrollIfDue = async (): Promise<void> => {
  if (!shouldRunPayrollToday()) {
    return;
  }

  await payrollService.runMonthlyPayrollBatch();
};
