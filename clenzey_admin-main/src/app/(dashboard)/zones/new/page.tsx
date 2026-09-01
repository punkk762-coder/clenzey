"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Save, Search, X } from "lucide-react";
import { toast } from "@/lib/toast";

import type { GeoJsonObject } from "geojson";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZoneMap } from "@/components/zones/ZoneMapDynamic";
import { servicesApi } from "@/lib/api/services";
import { zonesApi, type ZoneInput } from "@/lib/api/zones";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function NewZonePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<ZoneInput>>({
    name: "",
    slug: "",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    status: "ACTIVE",
    tier: "STANDARD",
    priority: 10,
  });
  const [boundary, setBoundary] = useState<number[][][][]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.list(),
  });

  // ── Location search ──
  type NominatimResult = {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    boundingbox: [string, string, string, string]; // [south, north, west, east]
    geojson?: GeoJsonObject;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [fitBoundsTarget, setFitBoundsTarget] = useState<[[number, number], [number, number]] | null>(null);
  const [previewGeoJSON, setPreviewGeoJSON] = useState<GeoJsonObject | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q.trim()) { setSearchResults([]); setPreviewGeoJSON(null); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=in&polygon_geojson=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
  }, []);

  const selectLocation = (r: NominatimResult) => {
    const [south, north, west, east] = r.boundingbox.map(parseFloat);
    if (south == null || north == null || west == null || east == null) return;
    setFitBoundsTarget([[south, west], [north, east]]);
    setPreviewGeoJSON(r.geojson ?? null);
    setSearchQuery(r.display_name.split(",")[0]!);
    setSearchResults([]);
  };

  const set = <K extends keyof ZoneInput>(key: K, value: ZoneInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const create = useMutation({
    mutationFn: () => {
      if (!form.name || !form.slug || !form.city || !form.state) {
        throw new Error("name, slug, city and state are required.");
      }
      if (boundary.length === 0) {
        throw new Error("Draw at least one polygon before saving.");
      }
      return zonesApi.create({
        ...(form as ZoneInput),
        boundary,
        ...(selectedServiceIds.length > 0 && { serviceIds: selectedServiceIds }),
      });
    },
    onSuccess: () => {
      toast.success("Zone created");
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      router.push("/zones");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't create zone")),
  });

  return (
    <PageStack density="compact">
      <section className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/zones">
            <ArrowLeft className="h-4 w-4" /> Back to geofences
          </Link>
        </Button>

        <PageHeader
        eyebrow="Catalogue · New geofence"
        title="Draw a service zone"
        description="Use the polygon tool on the map to enclose the area you want to serve. The first saved polygon becomes the primary boundary; you can edit and add more before saving."
        actions={
          <Button
            variant="signal"
            size="sm"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            <Save className="h-4 w-4" />
            {create.isPending ? "Saving…" : "Save zone"}
          </Button>
        }
      />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Map card */}
        <Card className="overflow-hidden">
          <div className="relative z-[1000] border-b border-base-300 px-4 pb-3 pt-4">
            <div className="relative">
              <InputGroup>
                {searchLoading
                  ? <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-60" />
                  : <Search className="h-4 w-4 shrink-0 opacity-60" />
                }
                <input
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by city, pincode or address to navigate map…"
                  className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setPreviewGeoJSON(null); }} className="opacity-60 transition-colors hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </InputGroup>

              {searchResults.length > 0 && (
                <ul className="menu absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
                  {searchResults.map(r => (
                    <li key={r.place_id}>
                      <button
                        type="button"
                        onClick={() => selectLocation(r)}
                        className="flex items-start gap-2.5 text-left"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="line-clamp-2 text-sm">{r.display_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="h-[600px]">
            <ZoneMap
              mode="draw"
              fitBoundsTarget={fitBoundsTarget}
              previewGeoJSON={previewGeoJSON}
              onBoundaryChange={setBoundary}
              center={[12.9716, 77.5946]}
              zoom={12}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Zone details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name ?? ""}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!form.slug || form.slug === slugify(form.name ?? "")) {
                      set("slug", slugify(e.target.value));
                    }
                  }}
                  placeholder="Indiranagar"
                  disabled={create.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug ?? ""}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="blr-indiranagar"
                  className="font-mono"
                  disabled={create.isPending}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city ?? ""}
                    onChange={(e) => set("city", e.target.value)}
                    disabled={create.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state ?? ""}
                    onChange={(e) => set("state", e.target.value)}
                    disabled={create.isPending}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status ?? "ACTIVE"}
                    onValueChange={(v) => set("status", v as ZoneInput["status"])}
                    disabled={create.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tier</Label>
                  <Select
                    value={form.tier ?? "STANDARD"}
                    onValueChange={(v) => set("tier", v as ZoneInput["tier"])}
                    disabled={create.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                      <SelectItem value="CORPORATE_ONLY">
                        Corporate only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={form.priority ?? 0}
                    onChange={(e) => set("priority", parseInt(e.target.value, 10))}
                    disabled={create.isPending}
                  />
                </div>
              </div>

              {/* Services available in this zone */}
              <div className="space-y-2">
                <Label>Available services</Label>
                <p className="text-xs opacity-60">
                  Leave all unchecked to enable every active service automatically.
                </p>
                <div className="max-h-48 overflow-y-auto rounded-box border border-base-300 bg-base-100 divide-y divide-base-300">
                  {allServices.filter(s => s.isActive).map(s => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-base-200">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={selectedServiceIds.includes(s.id)}
                        disabled={create.isPending}
                        onChange={e => setSelectedServiceIds(prev =>
                          e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                        )}
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
                  {allServices.filter(s => s.isActive).length === 0 && (
                    <p className="px-3 py-2 text-xs opacity-60">No active services found.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Polygon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="opacity-60">Polygons drawn</span>
                <span className="num font-mono">{boundary.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">Total points</span>
                <span className="num font-mono">
                  {boundary.reduce(
                    (s, poly) =>
                      s + poly.reduce((rs, ring) => rs + ring.length, 0),
                    0,
                  )}
                </span>
              </div>
              <p className="pt-2 leading-relaxed opacity-60">
                Use the toolbar in the top-right of the map. Polygons are stored
                as <code className="font-mono">geography(MultiPolygon, 4326)</code>{" "}
                in PostGIS.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageStack>
  );
}
