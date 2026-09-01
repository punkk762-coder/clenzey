"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, subDays } from "date-fns";
import {
  AlertTriangle,
  ClipboardList,
  DollarSign,
  Star,
  Users,
  Radar,
} from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PartnerGrowthChart } from "@/components/dashboard/PartnerGrowthChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { ActionChip } from "@/components/ui/action-chip";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { useKpiPolling } from "@/hooks/useKpiPolling";
import { usePartnerOperationalStatus } from "@/hooks/usePartnerOperationalStatus";
import { analyticsApi } from "@/lib/api/analytics";
import { compact, formatCurrency, initials } from "@/lib/utils/format";

function safeCompact(value: unknown): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return "—";
  return compact(n);
}

function safeRating(value: unknown): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

export default function OverviewPage() {
  const { data: kpiData, isLoading, isStale, retry, lastFetchedAt } =
    useKpiPolling();
  const { partners: fleetPartners } = usePartnerOperationalStatus();

  const fleetCounts = {
    inTransit: fleetPartners.filter((p) => p.status === "IN_TRANSIT").length,
    onJob: fleetPartners.filter((p) => p.status === "ON_JOB").length,
    idle: fleetPartners.filter((p) => p.status === "IDLE").length,
  };

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const {
    data: topPartners = [],
    isLoading: partnersLoading,
  } = useQuery({
    queryKey: ["partners", "top-performance", startDate, endDate],
    queryFn: () => analyticsApi.partners({ startDate, endDate }),
    select: (partners) => partners.slice(0, 5),
  });

  const stats = [
    {
      label: "Today's Bookings",
      value: isLoading ? undefined : safeCompact(kpiData?.totalBookings),
      change: kpiData?.totalBookingsChange,
      icon: ClipboardList,
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
    },
    {
      label: "Revenue Today",
      value: isLoading
        ? undefined
        : kpiData?.revenue != null && Number.isFinite(Number(kpiData.revenue))
          ? formatCurrency(kpiData.revenue)
          : "—",
      change: kpiData?.revenueChange,
      icon: DollarSign,
      iconBg: "bg-success/15",
      iconColor: "text-success",
    },
    {
      label: "Active Partners",
      value: isLoading ? undefined : safeCompact(kpiData?.activePartners),
      change: kpiData?.activePartnersChange,
      icon: Users,
      iconBg: "bg-secondary/15",
      iconColor: "text-secondary",
    },
    {
      label: "Avg. Rating",
      value: isLoading ? undefined : safeRating(kpiData?.averageRating),
      icon: Star,
      iconBg: "bg-warning/15",
      iconColor: "text-warning",
      subtitle: kpiData?.fulfillmentRate != null
        ? `${kpiData.fulfillmentRate.toFixed(0)}% fulfillment`
        : undefined,
    },
  ];

  const hasAlerts =
    !isLoading &&
    ((kpiData?.unassignedTasks ?? 0) > 0 || (kpiData?.activeDisputes ?? 0) > 0);

  return (
    <PageStack>
      <div className="flex flex-col gap-4">
        <PageHeader
          variant="compact"
          eyebrow="Operations"
          title="Performance Overview"
          description="Real-time monitoring of your partner ecosystem."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" size="sm" className="gap-1.5">
                <StatusDot variant="success" pulse />
                Live
              </Badge>
              {lastFetchedAt && (
                <span className="text-xs text-base-content/50">
                  Updated {formatDistanceToNow(lastFetchedAt, { addSuffix: true })}
                </span>
              )}
            </div>
          }
        />

        {isStale && (
          <Alert
            variant="warning"
            action={
              <Button variant="ghost" size="sm" onClick={retry}>
                Retry
              </Button>
            }
          >
            Showing cached KPI data — live refresh failed.
          </Alert>
        )}

        {hasAlerts && (
          <div className="flex flex-wrap gap-3">
            {(kpiData?.unassignedTasks ?? 0) > 0 && (
              <ActionChip href="/bookings" icon={ClipboardList} variant="warning">
                {kpiData?.unassignedTasks} unassigned booking
                {(kpiData?.unassignedTasks ?? 0) === 1 ? "" : "s"}
              </ActionChip>
            )}
            {(kpiData?.activeDisputes ?? 0) > 0 && (
              <ActionChip href="/disputes" icon={AlertTriangle} variant="error">
                {kpiData?.activeDisputes} open dispute
                {(kpiData?.activeDisputes ?? 0) === 1 ? "" : "s"}
              </ActionChip>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <ActionChip href="/partners/live" icon={Radar} variant="info">
            {fleetCounts.inTransit} in transit
          </ActionChip>
          <ActionChip href="/partners/live" icon={Radar} variant="warning">
            {fleetCounts.onJob} on job
          </ActionChip>
          <ActionChip href="/partners/live" icon={Users} variant="success">
            {fleetCounts.idle} idle online
          </ActionChip>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="card admin-kpi-card">
                  <div className="card-body gap-4 p-5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            : stats.map((stat) => (
                <KpiCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  change={stat.change}
                  subtitle={stat.subtitle}
                  icon={stat.icon}
                  iconBg={stat.iconBg}
                  iconColor={stat.iconColor}
                />
              ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <PartnerGrowthChart />
        <ActivityFeed />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold">Top Performing Partners</h3>
            <p className="text-xs text-base-content/55">
              Last 30 days · by volume &amp; satisfaction
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/partners">View all</Link>
          </Button>
        </div>

        <CardContent className="overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr className="border-b border-base-300 bg-base-200/40 text-xs font-semibold uppercase tracking-wide text-base-content/70">
                <th className="px-6 py-3">Partner</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Satisfaction</th>
                <th className="px-4 py-3">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {partnersLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4" colSpan={4}>
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : topPartners.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={Users}
                      heading="No partner data yet"
                      subtext="Performance rankings will appear once bookings are completed."
                    />
                  </td>
                </tr>
              ) : (
                topPartners.map((partner, index) => (
                  <tr
                    key={partner.partnerId}
                    className="border-b border-base-200 last:border-0 hover:bg-base-200/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-xs font-bold opacity-60">
                          {index + 1}
                        </span>
                        <div className="avatar placeholder">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-content">
                            {initials(partner.partnerName ?? "?")}
                          </div>
                        </div>
                        <Link
                          href={`/partners/${partner.partnerId}`}
                          className="font-medium link link-hover"
                        >
                          {partner.partnerName ?? "Unnamed"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="num font-semibold">
                        {partner.bookingsCompleted}
                      </span>
                      <span className="ml-1 text-xs opacity-50">bookings</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="num font-medium">
                          {partner.averageRating != null
                            ? partner.averageRating.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm">
                      {formatCurrency(partner.totalEarnings)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageStack>
  );
}
