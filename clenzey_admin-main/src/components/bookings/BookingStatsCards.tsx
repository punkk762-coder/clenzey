"use client";

import Link from "next/link";
import {
  CheckCircle,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { useKpiPolling } from "@/hooks/useKpiPolling";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface BookingStatsCardsProps {
  onManualDispatch?: () => void;
}

export function BookingStatsCards({ onManualDispatch }: BookingStatsCardsProps) {
  const { data, isLoading, error, retry } = useKpiPolling();

  const showPlaceholder = isLoading || error != null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Fulfillment Rate Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Fulfillment Rate
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold leading-none tracking-tight">
                  {showPlaceholder ? "—" : `${(data!.fulfillmentRate ?? 0).toFixed(1)}%`}
                </span>
                {!showPlaceholder && (
                  <TrendingUp className="h-4 w-4 text-success" />
                )}
              </div>
            </div>
            <CheckCircle
              className="h-5 w-5 text-success"
              strokeWidth={1.5}
            />
          </div>
          {error && !isLoading && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-error">Failed to load</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={retry}
                className="h-6 gap-1 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Tasks Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Unassigned Tasks
              </div>
              <span className="text-3xl font-bold leading-none tracking-tight">
                {showPlaceholder ? "—" : data!.unassignedTasks}
              </span>
            </div>
            <ClipboardList
              className="h-5 w-5 opacity-60"
              strokeWidth={1.5}
            />
          </div>
          <div className="mt-4">
            {error && !isLoading ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-error">Failed to load</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retry}
                  className="h-6 gap-1 px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : (
              <Button
                variant="warning"
                size="sm"
                asChild
                className="w-full text-xs font-semibold uppercase tracking-wider"
              >
                <Link href="/dispatch">Manual Dispatch</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Disputes Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Active Disputes
              </div>
              <span className="text-3xl font-bold leading-none tracking-tight">
                {showPlaceholder ? "—" : data!.activeDisputes}
              </span>
            </div>
            <AlertTriangle
              className="h-5 w-5 text-warning"
              strokeWidth={1.5}
            />
          </div>
          <div className="mt-4">
            {error && !isLoading ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-error">Failed to load</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retry}
                  className="h-6 gap-1 px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                asChild
                className="w-full text-xs font-semibold uppercase tracking-wider"
              >
                <Link href="/disputes">Resolution Hub</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
