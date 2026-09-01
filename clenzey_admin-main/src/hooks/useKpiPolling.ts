"use client";

import { useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { analyticsApi } from "@/lib/api/analytics";
import { bookingsApi } from "@/lib/api/bookings";
import { disputesApi } from "@/lib/api/disputes";
import type { KpiData } from "@/types";

const DEFAULT_POLLING_INTERVAL = 60_000; // 60 seconds

async function fetchKpis(): Promise<KpiData> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    kpis,
    openDisputes,
    underReviewDisputes,
    confirmedBookings,
    recentBookings,
  ] = await Promise.all([
    analyticsApi.kpis(),
    disputesApi.list({ status: "OPEN", limit: 1 }),
    disputesApi.list({ status: "UNDER_REVIEW", limit: 1 }),
    bookingsApi.list({ status: "CONFIRMED", limit: 100 }),
    bookingsApi.list({ limit: 100 }),
  ]);

  const todayBookings = recentBookings.bookings.filter(
    (booking) => new Date(booking.createdAt) >= todayStart,
  );
  const completedToday = todayBookings.filter(
    (booking) => booking.status === "COMPLETED",
  ).length;
  const fulfillmentRate =
    kpis.totalBookings > 0
      ? (completedToday / kpis.totalBookings) * 100
      : todayBookings.length > 0
        ? (completedToday / todayBookings.length) * 100
        : 0;

  const unassignedTasks = confirmedBookings.bookings.filter(
    (booking) => !booking.partnerId,
  ).length;

  return {
    ...kpis,
    fulfillmentRate,
    activeDisputes:
      (openDisputes.total ?? 0) + (underReviewDisputes.total ?? 0),
    unassignedTasks,
  };
}

/**
 * Fetches KPI data with configurable polling interval (default 60s).
 * Caches last successful response for stale-data fallback.
 */
export function useKpiPolling(intervalMs?: number): {
  data: KpiData | null;
  isLoading: boolean;
  isStale: boolean;
  lastFetchedAt: Date | null;
  error: Error | null;
  retry: () => void;
} {
  const pollingInterval = intervalMs ?? DEFAULT_POLLING_INTERVAL;
  const lastFetchedAtRef = useRef<Date | null>(null);

  const {
    data,
    isLoading,
    error,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery<KpiData, Error>({
    queryKey: ["kpis"],
    queryFn: async () => {
      const response = await fetchKpis();
      lastFetchedAtRef.current = new Date();
      return response;
    },
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
    retry: 1,
  });

  const isStale = isError && data != null;
  const lastFetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : lastFetchedAtRef.current;

  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data ?? null,
    isLoading,
    isStale,
    lastFetchedAt,
    error: error ?? null,
    retry,
  };
}
