"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ZoneMap } from "@/components/zones/ZoneMapDynamic";
import { zonesApi } from "@/lib/api/zones";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function ZonesPage() {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["zones"],
    queryFn: () => zonesApi.list({ limit: 100 }),
  });

  const zonesMissingBoundaries =
    zones.length > 0 && zones.some((zone) => !zone.boundaryGeoJSON);

  const zonesWithGeo = useQuery({
    queryKey: ["zones", "with-geo", zones.map((zone) => zone.id).join(",")],
    enabled: zonesMissingBoundaries,
    queryFn: async () => {
      const fetched = await Promise.all(
        zones
          .filter((zone) => !zone.boundaryGeoJSON)
          .map((zone) => zonesApi.get(zone.id)),
      );
      const fetchedById = new Map(fetched.map((zone) => [zone.id, zone]));
      return zones.map((zone) => fetchedById.get(zone.id) ?? zone);
    },
  });

  const mapZones =
    zonesWithGeo.data ??
    (zones.some((zone) => zone.boundaryGeoJSON) ? zones : []);

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      zonesApi.update(id, { status: isActive ? "ACTIVE" : "INACTIVE" }),
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => setTogglingId(null),
    onSuccess: () => {
      toast.success("Zone updated");
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't update zone")),
  });

  return (
    <PageStack>
      <PageHeader
        eyebrow="Catalogue · Geofences"
        title="Service polygons"
        description="The shapes of your coverage. Bookings outside an active polygon are rejected at creation time."
        actions={
          <Button asChild variant="signal" size="sm">
            <Link href="/zones/new">
              <Plus className="h-4 w-4" />
              Draw new zone
            </Link>
          </Button>
        }
      />

      {/* Coverage map */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Coverage map</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[460px] w-full">
            <ZoneMap mode="view" zones={mapZones} />
          </div>
        </CardContent>
      </Card>

      {/* Zone cards list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-box" />
          ))
        ) : zones.length === 0 ? (
          <div className="card col-span-full bg-base-100 shadow-sm">
            <div className="card-body items-center py-12 text-center opacity-60">
              No service zones yet — draw your first polygon to begin onboarding
              a city.
            </div>
          </div>
        ) : (
          zones.map((z) => (
            <Card key={z.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      {z.name}
                    </CardTitle>
                    <div className="text-xs opacity-60">
                      {z.slug} · {z.city}, {z.state}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        z.status === "ACTIVE"
                          ? "success"
                          : z.status === "DRAFT"
                          ? "warning"
                          : "muted"
                      }
                    >
                      {z.status}
                    </Badge>
                    <Badge variant="outline">{z.tier}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-end gap-3 text-sm">
                {togglingId === z.id ? (
                  <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                ) : (
                  <Switch
                    checked={z.status === "ACTIVE"}
                    disabled={togglingId !== null}
                    onCheckedChange={(checked) =>
                      toggleStatus.mutate({ id: z.id, isActive: checked })
                    }
                  />
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/zones/${z.id}`}>Edit →</Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageStack>
  );
}
