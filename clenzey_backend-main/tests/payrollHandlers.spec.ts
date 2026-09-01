import { afterEach, describe, expect, it, vi } from "vitest";

import * as payrollHandlers from "../src/workers/payrollHandlers.ts";
import * as payrollService from "../src/api/v1/payroll/service.ts";

describe("payrollHandlers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs payroll only between the 1st and 5th in IST", () => {
    expect(payrollHandlers.shouldRunPayrollToday(new Date("2026-06-01T06:30:00.000Z"))).toBe(
      true,
    );
    expect(payrollHandlers.shouldRunPayrollToday(new Date("2026-06-05T06:30:00.000Z"))).toBe(
      true,
    );
    expect(payrollHandlers.shouldRunPayrollToday(new Date("2026-06-06T06:30:00.000Z"))).toBe(
      false,
    );
    expect(payrollHandlers.shouldRunPayrollToday(new Date("2026-06-15T06:30:00.000Z"))).toBe(
      false,
    );
  });

  it("runs the monthly payroll batch on due dates", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-01T06:30:00.000Z") });
    const batchSpy = vi
      .spyOn(payrollService, "runMonthlyPayrollBatch")
      .mockResolvedValue(undefined as never);

    await payrollHandlers.runPayrollIfDue();

    expect(batchSpy).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("skips payroll outside the due window", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-15T06:30:00.000Z") });
    const batchSpy = vi.spyOn(payrollService, "runMonthlyPayrollBatch");

    await payrollHandlers.runPayrollIfDue();

    expect(batchSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
