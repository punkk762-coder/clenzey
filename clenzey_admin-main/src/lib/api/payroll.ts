import { api } from "./client";
import { normalizePaginatedList } from "./normalize";

export type PartnerSalary = {
  monthlySalary: number | null;
  isPayrollActive: boolean;
  salaryEffectiveFrom: string | null;
};

export type PayrollRun = {
  id: string;
  partnerId: string;
  payrollPeriod: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  grossAmount: string | null;
  netAmount: string | null;
  deductionAmount: string | null;
  absentDays: number;
  processedAt: string | null;
  createdAt: string;
};

type BackendPartnerSalary = {
  monthlySalary: number | string | null;
  isPayrollActive: boolean;
  salaryEffectiveFrom: string | Date | null;
  partnerId?: string;
};

type BackendPayrollRun = {
  id: string;
  partnerId: string;
  payrollPeriod: string;
  status: PayrollRun["status"];
  baseSalary?: string | number | null;
  netSalary?: string | number | null;
  grossAmount?: string | number | null;
  netAmount?: string | number | null;
  deductionAmount?: string | number | null;
  absentDays?: number | null;
  processedAt?: string | Date | null;
  createdAt?: string | Date;
};

function toIsoDate(value: string | Date | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toMoneyString(
  value: string | number | null | undefined,
): string | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? String(n) : null;
}

function toNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Normalize backend salary config to the admin UI shape. */
export function mapPartnerSalary(raw: BackendPartnerSalary): PartnerSalary {
  return {
    monthlySalary: toNullableNumber(raw.monthlySalary),
    isPayrollActive: raw.isPayrollActive,
    salaryEffectiveFrom: raw.salaryEffectiveFrom
      ? toIsoDate(raw.salaryEffectiveFrom)
      : null,
  };
}

/** Normalize backend payroll run records to the admin UI shape. */
export function mapPayrollRun(raw: BackendPayrollRun): PayrollRun {
  return {
    id: raw.id,
    partnerId: raw.partnerId,
    payrollPeriod: raw.payrollPeriod,
    status: raw.status,
    grossAmount: toMoneyString(raw.grossAmount ?? raw.baseSalary),
    netAmount: toMoneyString(raw.netAmount ?? raw.netSalary),
    deductionAmount: toMoneyString(raw.deductionAmount),
    absentDays: raw.absentDays ?? 0,
    processedAt: raw.processedAt ? toIsoDate(raw.processedAt) : null,
    createdAt: toIsoDate(raw.createdAt),
  };
}

export const payrollApi = {
  getSalary: async (partnerId: string): Promise<PartnerSalary | null> => {
    const res = await api.get<{ data: { salary: BackendPartnerSalary | null } }>(
      `/admin/partners/${partnerId}/salary`,
    );
    const salary = res.data.data.salary;
    return salary ? mapPartnerSalary(salary) : null;
  },

  setSalary: async (
    partnerId: string,
    input: {
      monthlySalary: number;
      isPayrollActive?: boolean;
      salaryEffectiveFrom?: string;
    },
  ) => {
    const res = await api.patch<{ data: { partner: unknown } }>(
      `/admin/partners/${partnerId}/salary`,
      input,
    );
    return res.data.data.partner;
  },

  setAttendance: async (
    partnerId: string,
    period: string,
    absentDays: number,
  ) => {
    const res = await api.put<{ data: { attendance: unknown } }>(
      `/admin/partners/${partnerId}/attendance/${period}`,
      { absentDays },
    );
    return res.data.data.attendance;
  },

  listRuns: async (params?: {
    partnerId?: string;
    payrollPeriod?: string;
    status?: PayrollRun["status"];
    limit?: number;
    offset?: number;
  }) => {
    const res = await api.get<{ data: unknown }>("/admin/payroll/runs", {
      params,
    });
    const { items, total } = normalizePaginatedList<BackendPayrollRun>(
      res.data.data,
      ["runs", "payrollRuns"],
    );
    return { runs: items.map(mapPayrollRun), total };
  },

  reprocessRun: async (period: string, partnerId: string) => {
    const res = await api.post<{ data: { run: BackendPayrollRun } }>(
      `/admin/payroll/runs/${period}/reprocess`,
      { partnerId },
    );
    return mapPayrollRun(res.data.data.run);
  },
};
