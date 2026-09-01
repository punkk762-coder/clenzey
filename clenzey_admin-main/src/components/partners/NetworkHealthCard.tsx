"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { analyticsApi } from "@/lib/api/analytics";
import { inr } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function NetworkHealthCard() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: partners = [], isLoading, error, refetch } = useQuery({
    queryKey: ["partner-analytics", thirtyDaysAgo, today],
    queryFn: () =>
      analyticsApi.partners({ startDate: thirtyDaysAgo, endDate: today }),
    staleTime: 5 * 60 * 1000,
  });

  const summary = useMemo(() => {
    if (partners.length === 0) {
      return {
        activePartners: 0,
        totalPayouts: 0,
        avgBookings: 0,
        activeCapacity: 0,
      };
    }

    const activePartners = partners.filter((p) => p.bookingsCompleted > 0).length;
    const totalPayouts = partners.reduce((sum, p) => sum + p.totalEarnings, 0);
    const avgBookings =
      partners.reduce((sum, p) => sum + p.bookingsCompleted, 0) / partners.length;
    const activeCapacity = (activePartners / partners.length) * 100;

    return {
      activePartners,
      totalPayouts,
      avgBookings,
      activeCapacity,
    };
  }, [partners]);

  const hasError = error != null && !isLoading;
  const showPlaceholder = isLoading || hasError;
  const capacityWarning = !showPlaceholder && summary.activeCapacity > 90;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 opacity-60" strokeWidth={1.5} />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Network Health
            </h3>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                  <span className="text-xs opacity-60">Active Capacity</span>
                </div>
                <span className="font-mono text-sm font-medium">
                  {showPlaceholder
                    ? "—"
                    : `${summary.activeCapacity.toFixed(1)}%`}
                </span>
              </div>
              <progress
                className={cn(
                  "progress w-full",
                  summary.activeCapacity > 90
                    ? "progress-error"
                    : summary.activeCapacity > 70
                      ? "progress-warning"
                      : "progress-success",
                )}
                value={
                  showPlaceholder ? 0 : Math.min(summary.activeCapacity, 100)
                }
                max={100}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                <span className="text-xs opacity-60">Total Payouts</span>
              </div>
              <span className="font-mono text-sm font-medium">
                {showPlaceholder ? "—" : inr(summary.totalPayouts)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                <span className="text-xs opacity-60">Avg. Bookings</span>
              </div>
              <span className="font-mono text-sm font-medium">
                {showPlaceholder ? "—" : summary.avgBookings.toFixed(1)}
              </span>
            </div>
          </div>

          {hasError && (
            <div className="alert alert-error mt-4 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Failed to load</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="ml-auto h-6 gap-1 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {capacityWarning && (
        <div className="alert alert-warning shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Attention Required: Audit
            </p>
            <p className="mt-0.5 text-xs opacity-70">
              Partners have reached commission thresholds. Review required.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 text-xs">
            Run Review Cycle
          </Button>
        </div>
      )}
    </div>
  );
}
