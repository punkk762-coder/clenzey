"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Heart,
  IndianRupee,
  Repeat,
  Search,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PayoutTable } from "@/components/payments/PayoutTable";
import { RefundTracker } from "@/components/payments/RefundTracker";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { RatingsChart } from "@/components/payments/RatingsChart";
import { paymentsApi } from "@/lib/api/payments";
import { analyticsApi } from "@/lib/api/analytics";
import { inr } from "@/lib/utils/format";

function MiniBarChart({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm bg-primary/60"
          style={{ height: `${Math.max((value / max) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payments", "summary"],
    queryFn: async () => {
      const res = await paymentsApi.summary();
      return res.data;
    },
  });

  const {
    data: customerAnalytics,
    isLoading: customerLoading,
    isError: customerError,
    refetch: refetchCustomer,
  } = useQuery({
    queryKey: ["analytics", "customers"],
    queryFn: () => analyticsApi.customers(),
  });

  return (
    <PageStack>
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Finance · Payments & Reports"
          title="Payments"
          description="Monitor revenue, manage partner payouts, track refunds, and analyze ratings."
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
          <Input
            placeholder="Search transactions, partners, refunds…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled
            title="Search is not supported by the payments API yet"
          />
        </div>

        {isError && (
          <ErrorState
            message="Failed to load payments summary"
            onRetry={() => refetch()}
          />
        )}

        {customerError && !isError && (
          <ErrorState
            message="Failed to load customer analytics"
            onRetry={() => refetchCustomer()}
          />
        )}
      </div>

      {!isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Total Revenue"
            value={isLoading ? undefined : summary ? inr(summary.totalRevenue) : undefined}
            icon={IndianRupee}
            iconBg="bg-primary/15"
            iconColor="text-primary"
            change={summary?.revenueChange ?? undefined}
            subtitle="Last 30 days"
          >
            {!isLoading && summary?.dailyRevenue && (
              <MiniBarChart data={summary.dailyRevenue} />
            )}
          </KpiCard>

          <KpiCard
            label="Partner Payouts"
            value={isLoading ? undefined : summary ? inr(summary.totalPayouts) : undefined}
            icon={Users}
            iconBg="bg-base-200"
            iconColor="opacity-60"
            subtitle={
              isLoading
                ? undefined
                : summary
                  ? `${summary.pendingPayouts} pending · paid out`
                  : "Pending: —"
            }
          />

          <KpiCard
            label="Refund Rate"
            value={
              isLoading
                ? undefined
                : summary
                  ? `${summary.refundRate.toFixed(1)}%`
                  : undefined
            }
            icon={AlertCircle}
            iconBg="bg-warning/15"
            iconColor="text-warning"
            subtitle="Completed refunds vs revenue (30d)"
          />

          <KpiCard
            label="Open Refunds"
            value={isLoading ? undefined : summary ? String(summary.openRefunds) : undefined}
            icon={AlertCircle}
            iconBg="bg-warning/15"
            iconColor="text-warning"
            subtitle="Initiated refund requests"
          />

          <KpiCard
            label="Repeat Rate"
            value={
              customerLoading
                ? undefined
                : customerAnalytics?.repeatRate != null
                  ? `${customerAnalytics.repeatRate.toFixed(1)}%`
                  : undefined
            }
            icon={Repeat}
            iconBg="bg-primary/15"
            iconColor="text-primary"
            subtitle="Customers who rebook"
          />

          <KpiCard
            label="Lifetime Value"
            value={
              customerLoading
                ? undefined
                : customerAnalytics
                  ? inr(customerAnalytics.lifetimeValue)
                  : undefined
            }
            icon={Heart}
            iconBg="bg-primary/15"
            iconColor="text-primary"
            subtitle="Average customer LTV"
          />
        </div>
      )}

      <PayoutTable />
      <RefundTracker />
      <RatingsChart />
    </PageStack>
  );
}
