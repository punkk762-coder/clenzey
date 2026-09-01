import { api } from "./client";
import { toAnalyticsDateParams } from "./params";
import type {
  CustomerAnalyticsData,
  KpiData,
  PartnerPerformance,
  RevenueAnalyticsData,
} from "@/types";

// ─── Backend response shapes (clenzey_backend) ───────────────────────────────

type BackendRealTimeKPIs = {
  totalBookingsToday: number;
  revenueToday: string;
  activePartners: number;
  pendingApprovals: number;
  averageRating: string | null;
};

type BackendRevenueAnalytics = {
  dailyBreakdown: Array<{
    date: string;
    revenue: string;
    bookingCount: number;
  }>;
  totalRevenue: string;
  totalBookings: number;
  averageOrderValue: string;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    revenue: string;
    bookingCount: number;
  }>;
};

type BackendPartnerPerformanceRow = {
  partnerId: string;
  partnerName: string | null;
  bookingsCompleted: number;
  averageRating: string | null;
  totalEarnings: string;
  acceptanceRate: string | null;
};

type BackendCustomerAnalytics = {
  newSignupsPerDay: Array<{ date: string; signups: number }>;
  repeatBookingRate: string;
  averageLifetimeValue: string;
  topCustomers: Array<{
    consumerId: string;
    consumerName: string | null;
    totalSpend: string;
    bookingCount: number;
  }>;
};

function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalRating(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function mapRealTimeKPIs(raw: BackendRealTimeKPIs): KpiData {
  return {
    totalBookings: raw.totalBookingsToday,
    revenue: parseAmount(raw.revenueToday),
    activePartners: raw.activePartners,
    pendingApprovals: raw.pendingApprovals,
    averageRating: parseOptionalRating(raw.averageRating),
    fulfillmentRate: 0,
    unassignedTasks: 0,
    activeDisputes: 0,
  };
}

export function mapRevenueAnalytics(raw: BackendRevenueAnalytics): RevenueAnalyticsData {
  const dailyBreakdown = raw.dailyBreakdown.map((day) => ({
    date: day.date,
    revenue: parseAmount(day.revenue),
    bookingCount: day.bookingCount,
  }));

  const currentTotal = parseAmount(raw.totalRevenue);
  const midpoint = Math.floor(dailyBreakdown.length / 2);
  const firstHalf = dailyBreakdown
    .slice(0, midpoint)
    .reduce((sum, day) => sum + day.revenue, 0);
  const secondHalf = dailyBreakdown
    .slice(midpoint)
    .reduce((sum, day) => sum + day.revenue, 0);
  const previousPeriodChange =
    firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return {
    dailyBreakdown,
    totalRevenue: currentTotal,
    previousPeriodChange,
  };
}

export function mapPartnerPerformance(
  rows: BackendPartnerPerformanceRow[],
): PartnerPerformance[] {
  return rows.map((row) => ({
    partnerId: row.partnerId,
    partnerName: row.partnerName,
    bookingsCompleted: row.bookingsCompleted,
    averageRating: parseOptionalRating(row.averageRating),
    totalEarnings: parseAmount(row.totalEarnings),
    acceptanceRate: parseOptionalRating(row.acceptanceRate),
  }));
}

export function mapCustomerAnalytics(
  raw: BackendCustomerAnalytics,
): CustomerAnalyticsData {
  return {
    signupTrend: raw.newSignupsPerDay.map((row) => ({
      date: row.date,
      count: row.signups,
    })),
    activeUsers: raw.topCustomers.length,
    repeatRate: parseAmount(raw.repeatBookingRate),
    lifetimeValue: parseAmount(raw.averageLifetimeValue),
  };
}

export const analyticsApi = {
  kpis: async (): Promise<KpiData> => {
    const res = await api.get<{ data: { kpis: BackendRealTimeKPIs } }>(
      "/admin/kpis",
    );
    return mapRealTimeKPIs(res.data.data.kpis);
  },

  revenue: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<RevenueAnalyticsData> => {
    const res = await api.get<{ data: BackendRevenueAnalytics }>(
      "/admin/analytics/revenue",
      { params: toAnalyticsDateParams(params) },
    );
    return mapRevenueAnalytics(res.data.data);
  },

  partners: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<PartnerPerformance[]> => {
    const res = await api.get<{ data: { partners: BackendPartnerPerformanceRow[] } }>(
      "/admin/analytics/partners",
      { params: toAnalyticsDateParams(params) },
    );
    return mapPartnerPerformance(res.data.data.partners ?? []);
  },

  customers: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<CustomerAnalyticsData> => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);

    const startDate =
      params?.startDate ?? thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = params?.endDate ?? today.toISOString().slice(0, 10);

    const res = await api.get<{ data: BackendCustomerAnalytics }>(
      "/admin/analytics/customers",
      {
        params: toAnalyticsDateParams({ startDate, endDate }),
      },
    );
    return mapCustomerAnalytics(res.data.data);
  },

  commissionTotal: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<number> => {
    const res = await api.get<{ data: { totalIncentives: number | string } }>(
      "/admin/incentive-configs/total",
      {
        params: {
          from: new Date(`${params.startDate}T00:00:00.000Z`).toISOString(),
          to: new Date(`${params.endDate}T23:59:59.999Z`).toISOString(),
        },
      },
    );
    return parseAmount(res.data.data.totalIncentives);
  },
};
