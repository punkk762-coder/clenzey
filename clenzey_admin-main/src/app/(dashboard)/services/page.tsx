"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Search, MapPin } from "lucide-react";

import ServiceDetailPage from "@/app/(dashboard)/services/[id]/page";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCreationForm } from "@/components/services/ServiceCreationForm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { servicesApi } from "@/lib/api/services";
import { zonesApi } from "@/lib/api/zones";
import type { ZoneTier } from "@/types";

const SERVICE_TABS = [
  { value: "all", label: "All" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
] as const;

type ServiceTab = (typeof SERVICE_TABS)[number]["value"];

const TIER_LABEL: Record<ZoneTier, string> = {
  STANDARD: "Standard",
  PREMIUM: "Premium",
  CORPORATE_ONLY: "Corporate",
};

const TIER_COLOR: Record<ZoneTier, string> = {
  STANDARD: "text-success",
  PREMIUM: "text-primary",
  CORPORATE_ONLY: "text-secondary",
};

function summarizeZoneTiers(
  zones: Awaited<ReturnType<typeof zonesApi.list>>,
): Array<{ tier: ZoneTier; count: number; avgMultiplier: string }> {
  const groups = new Map<ZoneTier, { count: number; total: number }>();

  for (const zone of zones) {
    const current = groups.get(zone.tier) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += parseFloat(zone.surgeMultiplier) || 1;
    groups.set(zone.tier, current);
  }

  return (["STANDARD", "PREMIUM", "CORPORATE_ONLY"] as ZoneTier[])
    .filter((tier) => groups.has(tier))
    .map((tier) => {
      const group = groups.get(tier)!;
      const avg = group.total / group.count;
      return {
        tier,
        count: group.count,
        avgMultiplier: `${avg.toFixed(1)}x`,
      };
    });
}

export default function ServicesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [manageServiceId, setManageServiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ServiceTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["zones", "summary"],
    queryFn: () => zonesApi.list({ status: "ACTIVE" }),
  });

  const tierSummary = summarizeZoneTiers(zones);

  const filteredServices = services.filter((s) => {
    if (activeTab === "residential") return s.serviceType === "B2C";
    if (activeTab === "commercial") return s.serviceType === "B2B";
    return true;
  }).filter((s) =>
    searchQuery ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow="Catalogue · Services"
        title="Service catalogue"
        description="Pricing, variants, BHK packages, durations, and add-ons. Edits affect new bookings only — existing bookings keep their price snapshot."
        actions={
          <Button
            variant="signal"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        }
      />

      <Sheet
        open={showCreateForm}
        onOpenChange={(open) => {
          if (!open) setShowCreateForm(false);
        }}
      >
        <SheetContent className="flex h-full max-h-screen w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-base-300 px-6 pb-4 pt-8">
            <SheetTitle>New service</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <ServiceCreationForm onCancel={() => setShowCreateForm(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={manageServiceId !== null}
        onOpenChange={(open) => {
          if (!open) setManageServiceId(null);
        }}
      >
        <SheetContent className="flex h-full max-h-screen w-full flex-col overflow-hidden p-0 sm:max-w-5xl">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [&_.page-stack-compact>a:first-child]:hidden [&_.page-stack-compact>button:first-child]:hidden">
            {manageServiceId && (
              <ServiceDetailPage
                params={{ id: manageServiceId } as unknown as Promise<{ id: string }>}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              Zone surge multipliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zonesLoading ? (
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-28 rounded-box" />
                ))}
              </div>
            ) : tierSummary.length === 0 ? (
              <p className="text-sm opacity-60">
                No active zones configured yet.{" "}
                <Link href="/zones" className="link link-primary">
                  Manage zones
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tierSummary.map((zone) => (
                  <div
                    key={zone.tier}
                    className="card card-compact bg-base-200 shadow-sm"
                  >
                    <div className="card-body px-4 py-3">
                      <div className="text-xs opacity-60">
                        {TIER_LABEL[zone.tier]} · {zone.count} zone
                        {zone.count === 1 ? "" : "s"}
                      </div>
                      <div className={`text-lg font-semibold ${TIER_COLOR[zone.tier]}`}>
                        {zone.avgMultiplier}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Coverage
              </p>
              <h3 className="text-sm font-semibold">Zone-based pricing</h3>
            </div>
            <p className="text-xs leading-relaxed opacity-70">
              Surge multipliers are applied per service zone tier. Update zone
              boundaries and tiers from the zones workspace.
            </p>
            <Button variant="outline" size="sm" asChild className="w-fit">
              <Link href="/zones">Open zones</Link>
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b border-base-300 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PillTabs
              value={activeTab}
              onChange={setActiveTab}
              options={SERVICE_TABS}
              ariaLabel="Filter by service type"
            />
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40"
                aria-hidden
              />
              <Input
                placeholder="Search services…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
                aria-label="Search services"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-52 rounded-box" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-box border border-dashed border-base-300 px-6 py-12 text-center">
              <p className="text-sm font-medium">No services match your filters</p>
              <p className="mt-1 text-xs opacity-60">
                Try a different search term or create a new service.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((s) => (
                <Card key={s.id} className="group transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-4 h-28 rounded-box bg-gradient-to-br from-primary/10 to-secondary/10" />
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex gap-1.5">
                        <Badge variant={s.isActive ? "signal" : "muted"}>
                          {s.isActive ? "Active" : "Hidden"}
                        </Badge>
                        <Badge variant="muted">{s.serviceType}</Badge>
                      </div>
                      <Sparkles className="h-4 w-4 opacity-50 transition-colors group-hover:text-primary" />
                    </div>
                    <h4 className="text-base font-semibold">{s.name}</h4>
                    {s.tagline && (
                      <p className="mt-1 text-xs opacity-60">{s.tagline}</p>
                    )}
                    <div className="mt-3 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        onClick={() => setManageServiceId(s.id)}
                      >
                        Manage →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pricing strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm opacity-70">
          <p>
            <strong className="text-base-content">FIXED</strong> — a set price per variant or sub-variant.
          </p>
          <p>
            <strong className="text-base-content">INSPECTION</strong> — priced after an on-site assessment; a quotation must be accepted before billing.
          </p>
          <p>
            Pricing model is set per-variant (B2C) or per sub-variant (B2B).
          </p>
        </CardContent>
      </Card>
    </PageStack>
  );
}
