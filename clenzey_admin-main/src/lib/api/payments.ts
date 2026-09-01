import { api } from "./client";
import { normalizePaginatedList } from "./normalize";
import { API_MAX_PAGE_SIZE, toApiDateRange } from "./params";
import { analyticsApi } from "./analytics";
import { partnersApi } from "./partners";
import type {
  PayoutFilter,
  PaymentsSummaryResponse,
  PayoutListResponse,
  RefundListResponse,
  PayoutStatus,
  BackendPayoutStatus,
  RefundStatus,
  PartnerPayout,
  Refund,
} from "@/types";

export type RefundFilter = {
  status?: RefundStatus;
  bookingId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type InitiateRefundInput = {
  bookingId: string;
  amount: number;
  reason?: string;
};

export type InitiatePayoutInput = {
  partnerId: string;
  amount: number;
  notes?: string;
};

type BackendPayout = {
  id: string;
  partnerId: string;
  amount: string | number;
  status: BackendPayoutStatus;
  notes?: string | null;
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  createdAt?: string | Date;
};

type BackendRefund = {
  id: string;
  bookingId: string;
  amount: string | number;
  reason?: string | null;
  status: RefundStatus;
  createdAt: string | Date;
};

function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function toIsoDate(value: string | Date | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

function payoutAmount(payout: PartnerPayout): number {
  return payout.amount ?? payout.commissionAmount ?? 0;
}

function sumPayoutAmounts(payouts: PartnerPayout[]): number {
  return payouts.reduce((sum, payout) => sum + payoutAmount(payout), 0);
}

/** Map backend payout status to UI display status. */
export function mapPayoutStatus(status: BackendPayoutStatus): PayoutStatus {
  switch (status) {
    case "PAID":
      return "COMPLETED";
    case "FAILED":
      return "ON_HOLD";
    default:
      return status as PayoutStatus;
  }
}

/** Map UI payout status filter to backend enum. */
export function toBackendPayoutStatus(
  status?: PayoutStatus | BackendPayoutStatus,
): BackendPayoutStatus | undefined {
  if (!status) return undefined;
  switch (status) {
    case "COMPLETED":
      return "PAID";
    case "ON_HOLD":
      return "FAILED";
    case "PAID":
    case "FAILED":
    case "PROCESSING":
    case "PENDING":
      return status;
    default:
      return undefined;
  }
}

/** Normalize backend payout records to the admin UI shape. */
export function mapPayout(raw: BackendPayout): PartnerPayout {
  return {
    id: raw.id,
    partnerId: raw.partnerId,
    partnerName: "",
    amount: parseAmount(raw.amount),
    status: raw.status,
    notes: raw.notes ?? null,
    periodStart: raw.periodStart ? toIsoDate(raw.periodStart) : undefined,
    periodEnd: raw.periodEnd ? toIsoDate(raw.periodEnd) : undefined,
    createdAt: toIsoDate(raw.createdAt),
  };
}

/** Normalize backend refund records to the admin UI shape. */
export function mapRefund(raw: BackendRefund): Refund {
  const amount = parseAmount(raw.amount);
  return {
    id: raw.id,
    bookingId: raw.bookingId,
    refundAmount: amount,
    amount,
    reason: raw.reason ?? null,
    status: raw.status,
    createdAt: toIsoDate(raw.createdAt),
  };
}

async function enrichPayoutNames(
  payouts: PartnerPayout[],
): Promise<PartnerPayout[]> {
  const needsPartner = payouts.some((payout) => !payout.partnerName);
  if (!needsPartner) return payouts;

  const partners = await partnersApi.list({ limit: API_MAX_PAGE_SIZE });
  const partnerMap = new Map(
    partners.map((partner) => [partner.id, partner.fullName ?? ""]),
  );

  return payouts.map((payout) => ({
    ...payout,
    partnerName:
      payout.partnerName ||
      partnerMap.get(payout.partnerId) ||
      "Unknown partner",
  }));
}

function toRefundListParams(filter?: RefundFilter) {
  if (!filter) return undefined;
  const { startDate, endDate, ...rest } = filter;
  return { ...rest, ...toApiDateRange({ startDate, endDate }) };
}

async function listPayoutsPage(
  filter?: PayoutFilter,
): Promise<PayoutListResponse> {
  const { status, ...rest } = filter ?? {};
  const res = await api.get<{ data: unknown }>("/admin/payouts", {
    params: {
      ...rest,
      ...(status && { status: toBackendPayoutStatus(status) }),
    },
  });
  const { items, total } = normalizePaginatedList<BackendPayout>(
    res.data.data,
    ["payouts"],
  );
  return { data: items.map(mapPayout), total };
}

async function listRefundsPage(filter?: RefundFilter): Promise<RefundListResponse> {
  const res = await api.get<{ data: unknown }>("/admin/refunds", {
    params: toRefundListParams(filter),
  });
  const { items, total } = normalizePaginatedList<BackendRefund>(
    res.data.data,
    ["refunds"],
  );
  return { data: items.map(mapRefund), total };
}

async function fetchAllPayouts(filter: PayoutFilter): Promise<PartnerPayout[]> {
  const payouts: PartnerPayout[] = [];
  let offset = 0;

  while (true) {
    const page = await listPayoutsPage({
      ...filter,
      limit: API_MAX_PAGE_SIZE,
      offset,
    });
    payouts.push(...page.data);
    offset += page.data.length;
    if (page.data.length < API_MAX_PAGE_SIZE || offset >= page.total) {
      break;
    }
  }

  return payouts;
}

async function fetchAllRefunds(filter?: RefundFilter): Promise<Refund[]> {
  const refunds: Refund[] = [];
  let offset = 0;

  while (true) {
    const page = await listRefundsPage({
      ...filter,
      limit: API_MAX_PAGE_SIZE,
      offset,
    });
    refunds.push(...page.data);
    offset += page.data.length;
    if (page.data.length < API_MAX_PAGE_SIZE || offset >= page.total) {
      break;
    }
  }

  return refunds;
}

export const paymentsApi = {
  /** Composed from revenue analytics + payout/refund listings (no dedicated summary endpoint). */
  summary: async (): Promise<{ data: PaymentsSummaryResponse["data"] }> => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const dateTo = today.toISOString().slice(0, 10);
    const dateFrom = thirtyDaysAgo.toISOString().slice(0, 10);

    const [revenue, paidPayouts, pendingPayoutsRes, openRefundsRes, allRefunds] =
      await Promise.all([
        analyticsApi.revenue({ startDate: dateFrom, endDate: dateTo }),
        fetchAllPayouts({ status: "PAID" }),
        listPayoutsPage({ status: "PENDING", limit: 1, offset: 0 }),
        listRefundsPage({ status: "INITIATED", limit: 1, offset: 0 }),
        fetchAllRefunds(),
      ]);

    const dailyRevenue = revenue.dailyBreakdown?.map((d) => d.revenue) ?? [];
    const totalRefunded = allRefunds
      .filter((refund) => refund.status === "COMPLETED")
      .reduce((sum, refund) => sum + (refund.refundAmount ?? refund.amount ?? 0), 0);
    const refundRate =
      revenue.totalRevenue > 0
        ? Math.round((totalRefunded / revenue.totalRevenue) * 1000) / 10
        : 0;

    return {
      data: {
        totalRevenue: revenue.totalRevenue ?? 0,
        revenueChange: Math.round(revenue.previousPeriodChange ?? 0),
        dailyRevenue,
        totalPayouts: sumPayoutAmounts(paidPayouts),
        pendingPayouts: pendingPayoutsRes.total ?? 0,
        refundRate,
        openRefunds: openRefundsRes.total ?? 0,
      },
    };
  },

  payouts: async (
    filter?: PayoutFilter,
    options?: { enrich?: boolean },
  ): Promise<PayoutListResponse> => {
    const { data, total } = await listPayoutsPage(filter);
    const enrich = options?.enrich !== false;
    return {
      data: enrich ? await enrichPayoutNames(data) : data,
      total,
    };
  },

  /** Process payouts by updating each to PROCESSING (no batch endpoint). */
  processBatch: async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) =>
        api.patch(`/admin/payouts/${id}/status`, { status: "PROCESSING" }),
      ),
    );
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - successCount;
    if (failedCount > 0 && successCount === 0) {
      throw Object.assign(new Error("Batch processing failed"), {
        response: { data: { successCount, failedCount } },
      });
    }
    return { successCount, failedCount };
  },

  updatePayoutStatus: async (
    id: string,
    status: BackendPayoutStatus,
  ): Promise<PartnerPayout> => {
    const res = await api.patch<{ data: { payout: BackendPayout } }>(
      `/admin/payouts/${id}/status`,
      { status },
    );
    const payout = mapPayout(res.data.data.payout);
    const [enriched] = await enrichPayoutNames([payout]);
    return enriched;
  },

  initiatePayout: async (input: InitiatePayoutInput): Promise<PartnerPayout> => {
    const res = await api.post<{ data: { payout: BackendPayout } }>(
      "/admin/payouts",
      input,
    );
    const payout = mapPayout(res.data.data.payout);
    const [enriched] = await enrichPayoutNames([payout]);
    return enriched;
  },

  getPartnerAvailableBalance: async (
    partnerId: string,
  ): Promise<number> => {
    const res = await api.get<{
      data: { partnerId: string; availableBalance: number };
    }>("/admin/payouts/available-balance", {
      params: { partnerId },
    });
    const balance = res.data.data.availableBalance;
    return Number.isFinite(balance) ? balance : 0;
  },

  refunds: async (filter?: RefundFilter): Promise<RefundListResponse> =>
    listRefundsPage(filter),

  initiateRefund: (input: InitiateRefundInput) =>
    api.post("/admin/refunds", input),
};
