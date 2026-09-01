"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Star } from "lucide-react";
import { toast } from "@/lib/toast";

import { RoleGate } from "@/components/auth/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api/errors";
import { partnerZonesApi } from "@/lib/api/partnerZones";
import { zonesApi } from "@/lib/api/zones";

export function PartnerZonesCard({ partnerId }: { partnerId: string }) {
  const queryClient = useQueryClient();
  const [selectedZoneId, setSelectedZoneId] = useState("");

  const zonesQuery = useQuery({
    queryKey: ["partner-zones", partnerId],
    queryFn: () => partnerZonesApi.list(partnerId),
  });

  const allZonesQuery = useQuery({
    queryKey: ["zones"],
    queryFn: () => zonesApi.list(),
  });

  const assigned = zonesQuery.data ?? [];
  const availableToAdd = useMemo(() => {
    const assignedIds = new Set(assigned.map((z) => z.zoneId));
    return (allZonesQuery.data ?? []).filter((z) => !assignedIds.has(z.id));
  }, [allZonesQuery.data, assigned]);

  const assignMutation = useMutation({
    mutationFn: () =>
      partnerZonesApi.assign(partnerId, [selectedZoneId], selectedZoneId),
    onSuccess: () => {
      toast.success("Zone assigned");
      setSelectedZoneId("");
      queryClient.invalidateQueries({ queryKey: ["partner-zones", partnerId] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to assign zone")),
  });

  const removeMutation = useMutation({
    mutationFn: (zoneId: string) => partnerZonesApi.remove(partnerId, zoneId),
    onSuccess: () => {
      toast.success("Zone removed");
      queryClient.invalidateQueries({ queryKey: ["partner-zones", partnerId] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to remove zone")),
  });

  const primaryMutation = useMutation({
    mutationFn: (zoneId: string) => partnerZonesApi.setPrimary(partnerId, zoneId),
    onSuccess: () => {
      toast.success("Primary zone updated");
      queryClient.invalidateQueries({ queryKey: ["partner-zones", partnerId] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to set primary zone")),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" /> Service zones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {zonesQuery.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin opacity-60" />
        ) : assigned.length === 0 ? (
          <p className="text-sm opacity-60">No zones assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {assigned.map((zone) => (
              <li
                key={zone.zoneId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-300 px-3 py-2"
              >
                <div>
                  <div className="font-medium">{zone.zoneName}</div>
                  <div className="text-xs opacity-60">{zone.zoneCity}</div>
                </div>
                <div className="flex items-center gap-2">
                  {zone.isPrimary && (
                    <Badge variant="signal">
                      <Star className="mr-1 h-3 w-3" /> Primary
                    </Badge>
                  )}
                  <RoleGate allow="operate">
                    {!zone.isPrimary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => primaryMutation.mutate(zone.zoneId)}
                      >
                        Set primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(zone.zoneId)}
                    >
                      Remove
                    </Button>
                  </RoleGate>
                </div>
              </li>
            ))}
          </ul>
        )}

        <RoleGate allow="operate">
          <div className="flex flex-wrap items-end gap-2">
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Add zone…" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name} ({zone.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedZoneId || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Assign zone
            </Button>
          </div>
        </RoleGate>
      </CardContent>
    </Card>
  );
}
