"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  format,
  subDays,
  startOfWeek,
  startOfMonth,
  parseISO,
} from "date-fns";
import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import { analyticsApi } from "@/lib/api/analytics";
import type { PartnerGrowthPoint } from "@/types";

type Granularity = "Daily" | "Weekly" | "Monthly";

export function aggregateData(
  series: PartnerGrowthPoint[],
  granularity: Granularity,
): { label: string; bookings: number; revenue: number }[] {
  if (granularity === "Daily") {
    return series.map((point) => ({
      label: format(parseISO(point.date), "dd MMM"),
      bookings: point.bookings,
      revenue: point.revenue,
    }));
  }

  const grouped = new Map<string, { bookings: number; revenue: number }>();

  for (const point of series) {
    const date = parseISO(point.date);
    const key =
      granularity === "Weekly"
        ? format(startOfWeek(date, { weekStartsOn: 1 }), "dd MMM")
        : format(startOfMonth(date), "MMM yyyy");

    const existing = grouped.get(key) ?? { bookings: 0, revenue: 0 };
    existing.bookings += point.bookings;
    existing.revenue += point.revenue;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries()).map(([label, values]) => ({
    label,
    ...values,
  }));
}

export function PartnerGrowthChart() {
  const [granularity, setGranularity] = useState<Granularity>("Daily");

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const {
    data: revenueData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["analytics", "revenue", startDate, endDate],
    queryFn: () => analyticsApi.revenue({ startDate, endDate }),
  });

  const series = useMemo<PartnerGrowthPoint[]>(
    () =>
      (revenueData?.dailyBreakdown ?? []).map((day) => ({
        date: day.date,
        bookings: day.bookingCount,
        revenue: day.revenue,
      })),
    [revenueData],
  );

  const chartData = useMemo(
    () => aggregateData(series, granularity),
    [series, granularity],
  );

  const granularities: Granularity[] = ["Daily", "Weekly", "Monthly"];

  return (
    <div className="card admin-table-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold">Booking Volume Trend</h3>
          <p className="text-xs opacity-60">
            Bookings &amp; revenue · last 30 days
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-base-300 bg-base-200/60 p-0.5">
          {granularities.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                granularity === g
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full px-4 py-4">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full space-y-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-48 w-full" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          </div>
        )}

        {isError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-error">
              {error instanceof Error
                ? error.message
                : "Failed to load booking trends"}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn btn-outline btn-xs"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && chartData.length === 0 && (
          <EmptyState
            icon={BarChart3}
            heading="No booking trends yet"
            subtext="Chart will populate as bookings come in over the next 30 days."
          />
        )}

        {!isLoading && !isError && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            >
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="bookings"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <Line
                yAxisId="bookings"
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="oklch(var(--p))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue (INR)"
                stroke="oklch(var(--s))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
