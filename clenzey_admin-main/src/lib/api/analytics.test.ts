import { describe, expect, it } from "vitest";

import {
  mapCustomerAnalytics,
  mapPartnerPerformance,
  mapRealTimeKPIs,
  mapRevenueAnalytics,
} from "./analytics";

describe("analytics mappers", () => {
  it("maps realtime KPI payload from backend", () => {
    expect(
      mapRealTimeKPIs({
        totalBookingsToday: 12,
        revenueToday: "4500.50",
        activePartners: 8,
        pendingApprovals: 3,
        averageRating: "4.75",
      }),
    ).toEqual({
      totalBookings: 12,
      revenue: 4500.5,
      activePartners: 8,
      pendingApprovals: 3,
      averageRating: 4.75,
      fulfillmentRate: 0,
      unassignedTasks: 0,
      activeDisputes: 0,
    });
  });

  it("maps revenue analytics and coerces string amounts", () => {
    const mapped = mapRevenueAnalytics({
      dailyBreakdown: [
        { date: "2026-06-01", revenue: "1000", bookingCount: 2 },
        { date: "2026-06-02", revenue: "2000", bookingCount: 4 },
      ],
      totalRevenue: "3000",
      totalBookings: 6,
      averageOrderValue: "500",
      topServices: [],
    });

    expect(mapped.dailyBreakdown).toEqual([
      { date: "2026-06-01", revenue: 1000, bookingCount: 2 },
      { date: "2026-06-02", revenue: 2000, bookingCount: 4 },
    ]);
    expect(mapped.totalRevenue).toBe(3000);
  });

  it("maps partner performance rows", () => {
    expect(
      mapPartnerPerformance([
        {
          partnerId: "p1",
          partnerName: "Lakshmi Devi",
          bookingsCompleted: 5,
          averageRating: "4.5",
          totalEarnings: "1200.00",
          acceptanceRate: null,
        },
      ]),
    ).toEqual([
      {
        partnerId: "p1",
        partnerName: "Lakshmi Devi",
        bookingsCompleted: 5,
        averageRating: 4.5,
        totalEarnings: 1200,
        acceptanceRate: null,
      },
    ]);
  });

  it("maps customer analytics payload", () => {
    expect(
      mapCustomerAnalytics({
        newSignupsPerDay: [{ date: "2026-06-01", signups: 4 }],
        repeatBookingRate: "32.5",
        averageLifetimeValue: "8900.25",
        topCustomers: [],
      }),
    ).toEqual({
      signupTrend: [{ date: "2026-06-01", count: 4 }],
      activeUsers: 0,
      repeatRate: 32.5,
      lifetimeValue: 8900.25,
    });
  });
});
