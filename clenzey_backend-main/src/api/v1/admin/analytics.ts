import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  bookings,
  consumers,
  partnerLedgerEntries,
  partners,
  reviews,
  users,
} from "../../../db/schema.ts";

// ── In-memory cache with TTL ────────────────────────────────────────────────

const kpiCache = new Map<string, { data: unknown; expiresAt: number }>();

export const getCachedOrCompute = async <T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> => {
  const cached = kpiCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;
  const data = await compute();
  kpiCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
};

const CACHE_TTL_MS = 60_000; // 60 seconds

/** Exposed for testing: clear all cached entries */
export const clearCache = (): void => {
  kpiCache.clear();
};

// ── KPI Types ───────────────────────────────────────────────────────────────

export type RealTimeKPIs = {
  totalBookingsToday: number;
  revenueToday: string;
  activePartners: number;
  pendingApprovals: number;
  averageRating: string | null;
};

export type RevenueAnalytics = {
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

export type PartnerPerformanceRow = {
  partnerId: string;
  partnerName: string | null;
  bookingsCompleted: number;
  averageRating: string | null;
  totalEarnings: string;
  acceptanceRate: string | null;
};

export type CustomerAnalytics = {
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

// ── Service Functions ───────────────────────────────────────────────────────

export const getRealTimeKPIs = async (): Promise<RealTimeKPIs> => {
  return getCachedOrCompute("kpis:realtime", CACHE_TTL_MS, async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [bookingsResult] = await db
      .select({
        totalBookings: count(bookings.id),
        revenue: sql<string>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.status} = 'COMPLETED'), '0')`,
      })
      .from(bookings)
      .where(gte(bookings.createdAt, todayStart));

    const [activeResult] = await db
      .select({ count: count(partners.id) })
      .from(partners)
      .where(
        and(
          eq(partners.approvalStatus, "APPROVED"),
          eq(partners.isAvailable, true),
        ),
      );

    const [pendingResult] = await db
      .select({ count: count(partners.id) })
      .from(partners)
      .where(eq(partners.approvalStatus, "PENDING"));

    const [ratingResult] = await db
      .select({
        avgRating: sql<string | null>`round(avg(${reviews.rating}), 2)::text`,
      })
      .from(reviews);

    return {
      totalBookingsToday: bookingsResult?.totalBookings ?? 0,
      revenueToday: bookingsResult?.revenue ?? "0",
      activePartners: activeResult?.count ?? 0,
      pendingApprovals: pendingResult?.count ?? 0,
      averageRating: ratingResult?.avgRating ?? null,
    };
  });
};

export const getRevenueAnalytics = async (
  dateFrom: string,
  dateTo: string,
): Promise<RevenueAnalytics> => {
  const cacheKey = `kpis:revenue:${dateFrom}:${dateTo}`;
  return getCachedOrCompute(cacheKey, CACHE_TTL_MS, async () => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // Daily breakdown
    const dailyRows = await db
      .select({
        date: sql<string>`to_char(${bookings.createdAt}::date, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.status} = 'COMPLETED'), '0')`,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .where(and(gte(bookings.createdAt, from), lte(bookings.createdAt, to)))
      .groupBy(sql`${bookings.createdAt}::date`)
      .orderBy(sql`${bookings.createdAt}::date`);

    // Totals
    const [totals] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${bookings.totalAmount}), '0')`,
        totalBookings: count(bookings.id),
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          eq(bookings.status, "COMPLETED"),
        ),
      );

    const totalRevenue = totals?.totalRevenue ?? "0";
    const totalBookings = totals?.totalBookings ?? 0;
    const avgOrderValue =
      totalBookings > 0
        ? (parseFloat(totalRevenue) / totalBookings).toFixed(2)
        : "0";

    // Top services by revenue
    const topServicesRows = await db
      .select({
        serviceId: bookings.serviceId,
        serviceName: bookings.serviceName,
        revenue: sql<string>`coalesce(sum(${bookings.totalAmount}), '0')`,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          eq(bookings.status, "COMPLETED"),
        ),
      )
      .groupBy(bookings.serviceId, bookings.serviceName)
      .orderBy(desc(sql`sum(${bookings.totalAmount})`))
      .limit(10);

    return {
      dailyBreakdown: dailyRows.map((r) => ({
        date: r.date,
        revenue: r.revenue,
        bookingCount: r.bookingCount,
      })),
      totalRevenue,
      totalBookings,
      averageOrderValue: avgOrderValue,
      topServices: topServicesRows.map((r) => ({
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        revenue: r.revenue,
        bookingCount: r.bookingCount,
      })),
    };
  });
};

export const getPartnerPerformance = async (
  dateFrom: string,
  dateTo: string,
): Promise<PartnerPerformanceRow[]> => {
  const cacheKey = `kpis:partners:${dateFrom}:${dateTo}`;
  return getCachedOrCompute(cacheKey, CACHE_TTL_MS, async () => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const rows = await db
      .select({
        partnerId: partners.id,
        partnerName: partners.fullName,
        bookingsCompleted: sql<number>`count(${bookings.id}) filter (where ${bookings.status} = 'COMPLETED')`,
        averageRating: sql<string | null>`round(avg(${reviews.rating}), 2)::text`,
        totalEarnings: sql<string>`coalesce(
          sum(case when ${partnerLedgerEntries.type} in ('SALARY', 'INCENTIVE') then ${partnerLedgerEntries.amount}::numeric else 0 end)
          -
          sum(case when ${partnerLedgerEntries.type} = 'SALARY_DEDUCTION' then ${partnerLedgerEntries.amount}::numeric else 0 end)
        , '0')`,
      })
      .from(partners)
      .leftJoin(
        bookings,
        and(
          eq(bookings.partnerId, partners.id),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
        ),
      )
      .leftJoin(reviews, eq(reviews.partnerId, partners.id))
      .leftJoin(
        partnerLedgerEntries,
        and(
          eq(partnerLedgerEntries.partnerId, partners.id),
          gte(partnerLedgerEntries.earningDate, from),
          lte(partnerLedgerEntries.earningDate, to),
        ),
      )
      .where(eq(partners.approvalStatus, "APPROVED"))
      .groupBy(partners.id)
      .orderBy(
        desc(
          sql`count(${bookings.id}) filter (where ${bookings.status} = 'COMPLETED')`,
        ),
      )
      .limit(50);

    return rows.map((r) => ({
      partnerId: r.partnerId,
      partnerName: r.partnerName,
      bookingsCompleted: Number(r.bookingsCompleted ?? 0),
      averageRating: r.averageRating,
      totalEarnings: r.totalEarnings,
      acceptanceRate: null, // Would require assignment data aggregation
    }));
  });
};

export const getCustomerAnalytics = async (
  dateFrom: string,
  dateTo: string,
): Promise<CustomerAnalytics> => {
  const cacheKey = `kpis:customers:${dateFrom}:${dateTo}`;
  return getCachedOrCompute(cacheKey, CACHE_TTL_MS, async () => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // New signups per day
    const signupRows = await db
      .select({
        date: sql<string>`to_char(${users.createdAt}::date, 'YYYY-MM-DD')`,
        signups: count(consumers.id),
      })
      .from(consumers)
      .innerJoin(users, eq(users.id, consumers.id))
      .where(and(gte(users.createdAt, from), lte(users.createdAt, to)))
      .groupBy(sql`${users.createdAt}::date`)
      .orderBy(sql`${users.createdAt}::date`);

    // Repeat booking rate
    const [repeatResult] = await db
      .select({
        totalWithBookings: sql<number>`count(distinct ${bookings.consumerId})`,
        repeatCustomers: sql<number>`count(distinct ${bookings.consumerId}) filter (where (select count(*) from bookings b2 where b2.consumer_id = ${bookings.consumerId} and b2.status = 'COMPLETED') > 1)`,
      })
      .from(bookings)
      .where(eq(bookings.status, "COMPLETED"));

    const totalWithBookings = Number(repeatResult?.totalWithBookings ?? 0);
    const repeatCustomers = Number(repeatResult?.repeatCustomers ?? 0);
    const repeatRate =
      totalWithBookings > 0
        ? ((repeatCustomers / totalWithBookings) * 100).toFixed(2)
        : "0";

    // Average lifetime value
    const [ltvResult] = await db
      .select({
        avgLtv: sql<string>`coalesce(round(avg(consumer_total), 2)::text, '0')`,
      })
      .from(
        db
          .select({
            consumer_total: sql<number>`sum(${bookings.totalAmount})`.as(
              "consumer_total",
            ),
          })
          .from(bookings)
          .where(eq(bookings.status, "COMPLETED"))
          .groupBy(bookings.consumerId)
          .as("consumer_totals"),
      );

    // Top customers by spend
    const topCustomerRows = await db
      .select({
        consumerId: bookings.consumerId,
        consumerName: consumers.fullName,
        totalSpend: sql<string>`coalesce(sum(${bookings.totalAmount}), '0')`,
        bookingCount: count(bookings.id),
      })
      .from(bookings)
      .innerJoin(consumers, eq(consumers.id, bookings.consumerId))
      .where(
        and(
          eq(bookings.status, "COMPLETED"),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
        ),
      )
      .groupBy(bookings.consumerId, consumers.fullName)
      .orderBy(desc(sql`sum(${bookings.totalAmount})`))
      .limit(10);

    return {
      newSignupsPerDay: signupRows.map((r) => ({
        date: r.date,
        signups: r.signups,
      })),
      repeatBookingRate: repeatRate,
      averageLifetimeValue: ltvResult?.avgLtv ?? "0",
      topCustomers: topCustomerRows.map((r) => ({
        consumerId: r.consumerId,
        consumerName: r.consumerName,
        totalSpend: r.totalSpend,
        bookingCount: r.bookingCount,
      })),
    };
  });
};

// ── CSV Export ───────────────────────────────────────────────────────────────

export type BookingExportFilters = {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: string | undefined;
  serviceType?: string | undefined;
};

export type BookingExportRow = {
  bookingNumber: string;
  consumerName: string;
  consumerPhone: string;
  serviceName: string;
  status: string;
  scheduledAt: string | null;
  totalAmount: string;
  paymentStatus: string;
  createdAt: string;
};

export const getBookingsForExport = async (
  filters: BookingExportFilters,
): Promise<BookingExportRow[]> => {
  const conditions = [];

  if (filters.dateFrom) {
    conditions.push(gte(bookings.createdAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(bookings.createdAt, to));
  }
  if (filters.status) {
    conditions.push(eq(bookings.status, filters.status as never));
  }
  if (filters.serviceType) {
    conditions.push(eq(bookings.serviceId, filters.serviceType));
  }

  const rows = await db
    .select({
      bookingNumber: bookings.bookingNumber,
      consumerName: bookings.consumerName,
      consumerPhone: bookings.consumerPhone,
      serviceName: bookings.serviceName,
      status: bookings.status,
      scheduledAt: bookings.scheduledAt,
      totalAmount: bookings.totalAmount,
      paymentStatus: bookings.paymentStatus,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(10000);

  return rows.map((r) => ({
    bookingNumber: r.bookingNumber,
    consumerName: r.consumerName,
    consumerPhone: r.consumerPhone,
    serviceName: r.serviceName,
    status: r.status,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    totalAmount: r.totalAmount,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt.toISOString(),
  }));
};

export const bookingsToCsv = (rows: BookingExportRow[]): string => {
  const headers = [
    "Booking Number",
    "Consumer Name",
    "Consumer Phone",
    "Service Name",
    "Status",
    "Scheduled At",
    "Total Amount",
    "Payment Status",
    "Created At",
  ];

  const escapeCsvField = (field: string | null): string => {
    if (field === null) return "";
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvRows = rows.map((row) =>
    [
      escapeCsvField(row.bookingNumber),
      escapeCsvField(row.consumerName),
      escapeCsvField(row.consumerPhone),
      escapeCsvField(row.serviceName),
      escapeCsvField(row.status),
      escapeCsvField(row.scheduledAt),
      escapeCsvField(row.totalAmount),
      escapeCsvField(row.paymentStatus),
      escapeCsvField(row.createdAt),
    ].join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
};
