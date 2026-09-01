"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { RoleGate } from "@/components/auth/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  pricingSettingsApi,
  type PlatformPricingSettings,
} from "@/lib/api/pricingSettings";
import { dateShort, inr } from "@/lib/utils/format";

function formatPercent(value: number): string {
  return `${value}%`;
}

function SettingsSummary({ settings }: { settings: PlatformPricingSettings }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs uppercase tracking-wide opacity-60">GST rate</dt>
        <dd className="mt-1 text-lg font-semibold">{formatPercent(settings.gstRate)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide opacity-60">Platform fee (flat)</dt>
        <dd className="mt-1 text-lg font-semibold">{inr(settings.platformFeeFlat)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide opacity-60">Platform fee (%)</dt>
        <dd className="mt-1 text-lg font-semibold">
          {formatPercent(settings.platformFeePercent)}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide opacity-60">Effective from</dt>
        <dd className="mt-1 text-lg font-semibold">
          {settings.effectiveFrom ? dateShort(settings.effectiveFrom) : "Default"}
        </dd>
      </div>
    </dl>
  );
}

export default function PricingSettingsPage() {
  const queryClient = useQueryClient();
  const [gstRate, setGstRate] = useState("");
  const [platformFeeFlat, setPlatformFeeFlat] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["pricing-settings", "current"],
    queryFn: () => pricingSettingsApi.get(),
  });

  const historyQuery = useQuery({
    queryKey: ["pricing-settings", "history"],
    queryFn: () => pricingSettingsApi.history({ limit: 20, offset: 0 }),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setGstRate(String(settingsQuery.data.gstRate));
    setPlatformFeeFlat(String(settingsQuery.data.platformFeeFlat));
    setPlatformFeePercent(String(settingsQuery.data.platformFeePercent));
  }, [settingsQuery.data]);

  const publishMutation = useMutation({
    mutationFn: () =>
      pricingSettingsApi.update({
        gstRate: Number.parseFloat(gstRate),
        platformFeeFlat: Number.parseFloat(platformFeeFlat),
        platformFeePercent: Number.parseFloat(platformFeePercent),
        ...(effectiveFrom && { effectiveFrom }),
      }),
    onSuccess: () => {
      toast.success("Platform pricing updated");
      setEffectiveFrom("");
      queryClient.invalidateQueries({ queryKey: ["pricing-settings"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to update platform pricing")),
  });

  const current = settingsQuery.data;
  const history = historyQuery.data ?? [];

  const canPublish =
    gstRate !== "" &&
    platformFeeFlat !== "" &&
    platformFeePercent !== "" &&
    Number.parseFloat(gstRate) >= 0 &&
    Number.parseFloat(gstRate) <= 100 &&
    Number.parseFloat(platformFeePercent) >= 0 &&
    Number.parseFloat(platformFeePercent) <= 100 &&
    Number.parseFloat(platformFeeFlat) >= 0;

  return (
    <PageStack>
      <PageHeader
        eyebrow="Finance · Platform Pricing"
        title="Platform Pricing"
        description="Configure GST and platform fees applied globally to every service at booking time."
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Current effective rates</CardTitle>
            <p className="mt-1 text-sm opacity-60">
              These rates apply to all new booking previews and bookings.
            </p>
          </div>
          {current && (
            <Badge variant={current.isDefault ? "muted" : "signal"}>
              {current.isDefault ? "Default" : "Published"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {settingsQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin opacity-60" />
          ) : settingsQuery.isError ? (
            <ErrorState
              message="Failed to load platform pricing settings"
              onRetry={() => settingsQuery.refetch()}
            />
          ) : current ? (
            <SettingsSummary settings={current} />
          ) : null}
        </CardContent>
      </Card>

      <RoleGate allow="finance">
        <Card>
          <CardHeader>
            <CardTitle>Publish new configuration</CardTitle>
            <p className="text-sm opacity-60">
              Publishing creates a new version and deactivates the previous one.
              Existing bookings keep their snapshotted totals.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gst-rate">GST rate (%)</Label>
              <Input
                id="gst-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-fee-flat">Platform fee — flat (INR)</Label>
              <Input
                id="platform-fee-flat"
                type="number"
                min="0"
                step="0.01"
                value={platformFeeFlat}
                onChange={(e) => setPlatformFeeFlat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-fee-percent">Platform fee (%)</Label>
              <Input
                id="platform-fee-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={platformFeePercent}
                onChange={(e) => setPlatformFeePercent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective-from">Effective from (optional)</Label>
              <DatePicker
                id="effective-from"
                value={effectiveFrom}
                onChange={setEffectiveFrom}
                placeholder="Select date"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                variant="signal"
                disabled={!canPublish || publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Publish configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </RoleGate>

      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin opacity-60" />
          ) : historyQuery.isError ? (
            <ErrorState
              message="Failed to load pricing history"
              onRetry={() => historyQuery.refetch()}
            />
          ) : history.length === 0 ? (
            <p className="text-sm opacity-60">No published versions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective from</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Flat fee</TableHead>
                  <TableHead>Fee %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, index) => (
                  <TableRow key={entry.id ?? `default-${index}`}>
                    <TableCell className="text-sm">
                      {entry.effectiveFrom ? dateShort(entry.effectiveFrom) : "—"}
                    </TableCell>
                    <TableCell>{formatPercent(entry.gstRate)}</TableCell>
                    <TableCell>{inr(entry.platformFeeFlat)}</TableCell>
                    <TableCell>{formatPercent(entry.platformFeePercent)}</TableCell>
                    <TableCell>
                      <Badge variant={index === 0 ? "signal" : "muted"}>
                        {index === 0 ? "Active" : "Previous"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageStack>
  );
}
