"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Radio } from "lucide-react";

import { PartnerLiveMap } from "@/components/partners/PartnerLiveMapDynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerOperationalStatus } from "@/hooks/usePartnerOperationalStatus";
import type { PartnerOperationalStatus } from "@/lib/api/partnerOperationalStatus";

const STATUS_FILTERS: Array<PartnerOperationalStatus | "ALL"> = [
  "ALL",
  "IN_TRANSIT",
  "ON_JOB",
  "IDLE",
  "OFFLINE",
];

const STATUS_VARIANT: Record<
  PartnerOperationalStatus,
  "success" | "signal" | "warning" | "muted"
> = {
  IDLE: "success",
  IN_TRANSIT: "signal",
  ON_JOB: "warning",
  OFFLINE: "muted",
};

export default function LivePartnersPage() {
  const { partners, isLoading, socketDown, refetch } = usePartnerOperationalStatus();
  const [filter, setFilter] = useState<PartnerOperationalStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") return partners;
    return partners.filter((p) => p.status === filter);
  }, [partners, filter]);

  const counts = useMemo(() => {
    return {
      IN_TRANSIT: partners.filter((p) => p.status === "IN_TRANSIT").length,
      ON_JOB: partners.filter((p) => p.status === "ON_JOB").length,
      IDLE: partners.filter((p) => p.status === "IDLE").length,
      OFFLINE: partners.filter((p) => p.status === "OFFLINE").length,
    };
  }, [partners]);

  return (
    <PageStack>
      <PageHeader
        title="Live Partners"
        description="Monitor partner duty status and live locations in real time."
      />

      {socketDown ? (
        <Alert variant="warning">
          Reconnecting… Showing last known status. Refreshing every 30 seconds.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === status
                ? "bg-primary text-primary-content"
                : "bg-base-200 opacity-80 hover:opacity-100"
            }`}
          >
            {status === "ALL"
              ? `All (${partners.length})`
              : `${status.replaceAll("_", " ")} (${counts[status]})`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refetch()}
          className="ml-auto rounded-full bg-base-200 px-3 py-1 text-xs font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="max-h-[560px] space-y-2 overflow-y-auto p-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Radio}
                heading="No partners match"
                subtext="Try another status filter or wait for partners to go online."
              />
            ) : (
              filtered.map((partner) => {
                const staleMinutes =
                  partner.lastSeenAt != null
                    ? (Date.now() - new Date(partner.lastSeenAt).getTime()) / 60_000
                    : null;
                const warnStale = staleMinutes != null && staleMinutes > 2;
                return (
                  <button
                    key={partner.partnerId}
                    type="button"
                    onClick={() => setSelectedId(partner.partnerId)}
                    className={`flex w-full items-start gap-3 rounded-box border px-3 py-3 text-left transition ${
                      selectedId === partner.partnerId
                        ? "border-primary bg-primary/5"
                        : "border-base-300 hover:bg-base-200/60"
                    }`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/partners/${partner.partnerId}`}
                          className="truncate text-sm font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {partner.fullName ?? "Partner"}
                        </Link>
                        <Badge variant={STATUS_VARIANT[partner.status]}>
                          {partner.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p
                        className={`mt-1 text-xs ${
                          warnStale ? "text-warning" : "opacity-60"
                        }`}
                      >
                        {partner.lastSeenAt
                          ? `Last seen ${formatDistanceToNow(new Date(partner.lastSeenAt), { addSuffix: true })}`
                          : "Never seen"}
                      </p>
                      {partner.activeBookingId ? (
                        <Link
                          href={`/bookings/${partner.activeBookingId}`}
                          className="mt-1 block text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {partner.activeBookingNumber ?? "Active booking"}
                        </Link>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="h-[560px] p-2">
            <PartnerLiveMap
              partners={filtered}
              selectedPartnerId={selectedId}
              onSelect={setSelectedId}
            />
          </CardContent>
        </Card>
      </div>
    </PageStack>
  );
}
