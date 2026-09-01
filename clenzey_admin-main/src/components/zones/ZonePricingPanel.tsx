"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/errors";
import { servicesApi } from "@/lib/api/services";
import { zonePricingApi } from "@/lib/api/zonePricing";
import { inr } from "@/lib/utils/format";

export function ZonePricingPanel({ zoneId }: { zoneId: string }) {
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");

  const overridesQuery = useQuery({
    queryKey: ["zone-pricing", zoneId],
    queryFn: () => zonePricingApi.list(zoneId),
  });

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const serviceDetailQuery = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => servicesApi.get(serviceId),
    enabled: !!serviceId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      zonePricingApi.create(zoneId, {
        serviceId,
        variantId,
        overridePrice: Number.parseFloat(overridePrice),
      }),
    onSuccess: () => {
      toast.success("Price override created");
      setOverridePrice("");
      queryClient.invalidateQueries({ queryKey: ["zone-pricing", zoneId] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to create override")),
  });

  const removeMutation = useMutation({
    mutationFn: (overrideId: string) => zonePricingApi.remove(zoneId, overrideId),
    onSuccess: () => {
      toast.success("Override removed");
      queryClient.invalidateQueries({ queryKey: ["zone-pricing", zoneId] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to remove override")),
  });

  const overrides = overridesQuery.data ?? [];
  const variants = serviceDetailQuery.data?.variants ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zone price overrides</CardTitle>
        <p className="text-sm opacity-60">
          Override variant pricing within this geofence.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {(servicesQuery.data ?? []).map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Variant</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Override price</Label>
            <Input
              type="number"
              min="1"
              value={overridePrice}
              onChange={(e) => setOverridePrice(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <RoleGate allow="operate">
              <Button
                variant="signal"
                disabled={
                  !serviceId || !variantId || !overridePrice || createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                Add override
              </Button>
            </RoleGate>
          </div>
        </div>

        {overridesQuery.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin opacity-60" />
        ) : overrides.length === 0 ? (
          <p className="text-sm opacity-60">No overrides for this zone.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Price</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.serviceName ?? row.serviceId.slice(0, 8)}</TableCell>
                  <TableCell>{row.variantLabel ?? row.variantId.slice(0, 8)}</TableCell>
                  <TableCell>{inr(Number.parseFloat(row.overridePrice))}</TableCell>
                  <TableCell>
                    <RoleGate allow="operate">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </RoleGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
