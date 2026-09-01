"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyticsApi } from "@/lib/api/analytics";
import { inr } from "@/lib/utils/format";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: { revenue: number; bookings: number } }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const { revenue, bookings } = payload[0].payload;
  return (
    <div
      className="rounded-box border border-base-300 bg-base-100 px-3 py-2 shadow-md"
      style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
    >
      <p className="mb-1 opacity-60">{label}</p>
      <p>{formatINR(revenue)}</p>
      <p className="opacity-60">Bookings: {bookings}</p>
    </div>
  );
}

export function RevenueChart() {
  const dateRange = useMemo(() => {
    const today = new Date();
    const endDate = format(today, "yyyy-MM-dd");
    const startDate = format(subDays(today, 13), "yyyy-MM-dd");
    return { startDate, endDate };
  }, []);

  const {
    data: analyticsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["revenue-analytics", dateRange.startDate, dateRange.endDate],
    queryFn: () => analyticsApi.revenue(dateRange),
  });

  const chartData = useMemo(() => {
    if (!analyticsData?.dailyBreakdown) return [];
    return analyticsData.dailyBreakdown.map((day) => ({
      day: format(new Date(day.date), "dd MMM"),
      revenue: day.revenue,
      bookings: day.bookingCount,
    }));
  }, [analyticsData]);

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="flex items-end justify-between border-b border-base-300 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold">Revenue · 14 days</h3>
          <p className="text-xs opacity-60">
            Captured payments by day, including platform fees.
          </p>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
          INR · tnum
        </div>
      </div>
      <div className="h-[260px] w-full px-2 pb-2 pt-4">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-xs opacity-60">Loading revenue data…</span>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-error">Revenue data is unavailable.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="btn btn-outline btn-xs"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(var(--p))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(var(--p))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => inr(v)}
                width={70}
              />
              <Tooltip
                cursor={{ stroke: "oklch(var(--p))", strokeDasharray: "3 3" }}
                content={<CustomTooltip />}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="oklch(var(--p))"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
