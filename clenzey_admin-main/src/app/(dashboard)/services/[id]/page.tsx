"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { RoleGate } from "@/components/auth/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EditableList,
  EditableListAddPanel,
  EditableListEmpty,
  EditableListItem,
  EditableListRow,
} from "@/components/ui/editable-list";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegionalCoverage } from "@/components/services/RegionalCoverage";
import type { ServicePatch } from "@/lib/api/services";
import { servicesApi } from "@/lib/api/services";
import { zonesApi } from "@/lib/api/zones";
import { getApiErrorMessage } from "@/lib/api/errors";
import { inr } from "@/lib/utils/format";
import type { ServiceAddon, ServiceVariant } from "@/types";

const PRICING_MODELS = ["FIXED", "INSPECTION"] as const;

function computeDiscountPct(base: number, discounted: number): number {
  if (base <= 0 || discounted >= base) return 0;
  return Math.round(((base - discounted) / base) * 100);
}

// Payload normalizers — convert API read-shape to write-shape for PATCH.
const toVariantPayload = (v: ServiceVariant) => ({
  id: v.id,
  label: v.label,
  value: v.value,
  basePrice: parseFloat(v.basePrice),
  discountedPrice: parseFloat(v.discountedPrice),
  discountPercentage: v.discountPercentage,
  ...(v.pricingModel !== undefined && { pricingModel: v.pricingModel }),
  sortOrder: v.sortOrder,
  inclusions: (v.inclusions ?? []).map((inc) => ({
    id: inc.id,
    title: inc.title,
    description: inc.description,
    sortOrder: inc.sortOrder,
  })),
  subVariants: (v.subVariants ?? []).map((sv) => ({
    id: sv.id,
    label: sv.label,
    ...(sv.description != null && { description: sv.description }),
    basePrice: parseFloat(sv.basePrice),
    discountedPrice: parseFloat(sv.discountedPrice),
    ...(sv.pricingModel !== undefined && { pricingModel: sv.pricingModel }),
    sortOrder: sv.sortOrder,
  })),
});

const toAddonPayload = (a: ServiceAddon) => ({
  id: a.id,
  name: a.name,
  description: a.description,
  price: parseFloat(a.price),
  discountedPrice: parseFloat(a.discountedPrice),
  discountPercentage: a.discountPercentage,
  sortOrder: a.sortOrder,
});

// ─── Variant dialog ────────────────────────────────────────────────
type InclusionDraft = { id?: string; title: string; description: string };
type SubVariantDraft = { id?: string; label: string; description?: string; basePrice: number; discountedPrice: number; pricingModel?: "FIXED" | "INSPECTION"; sortOrder: number };
type VariantDraft = {
  label: string;
  value: string;
  basePrice: number;
  discountedPrice: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder: number;
  inclusions: InclusionDraft[];
  subVariants: SubVariantDraft[];
};
const emptyVariant: VariantDraft = {
  label: "", value: "", basePrice: 0, discountedPrice: 0, sortOrder: 0,
  inclusions: [], subVariants: [],
};

function VariantDialog({
  open, onClose, initial, onSave, saving, serviceType,
}: {
  open: boolean;
  onClose: () => void;
  initial: VariantDraft | null;
  onSave: (v: VariantDraft) => void;
  saving: boolean;
  serviceType: "B2C" | "B2B";
}) {
  const [v, setV] = useState<VariantDraft>(initial ?? emptyVariant);
  const [newIncTitle, setNewIncTitle] = useState("");
  const [newIncDesc, setNewIncDesc] = useState("");
  const [newSvLabel, setNewSvLabel] = useState("");
  const [newSvDescription, setNewSvDescription] = useState("");
  const [newSvBase, setNewSvBase] = useState(0);
  const [newSvDiscounted, setNewSvDiscounted] = useState(0);
  const [newSvPricingModel, setNewSvPricingModel] = useState<"FIXED" | "INSPECTION">("FIXED");

  useEffect(() => {
    if (open) {
      setV(initial ?? emptyVariant);
      setNewIncTitle("");
      setNewIncDesc("");
      setNewSvLabel("");
      setNewSvDescription("");
      setNewSvBase(0);
      setNewSvDiscounted(0);
      setNewSvPricingModel("FIXED");
    }
  }, [open, initial]);

  const isEdit = !!initial;
  const discountPct = computeDiscountPct(v.basePrice, v.discountedPrice);

  const addInclusion = () => {
    if (!newIncTitle.trim()) return;
    setV((s) => ({
      ...s,
      inclusions: [...s.inclusions, { title: newIncTitle.trim(), description: newIncDesc.trim() }],
    }));
    setNewIncTitle("");
    setNewIncDesc("");
  };

  const addSubVariant = () => {
    if (!newSvLabel.trim()) return;
    setV((s) => ({
      ...s,
      subVariants: [
        ...s.subVariants,
        { label: newSvLabel.trim(), description: newSvDescription.trim() || undefined, basePrice: newSvBase, discountedPrice: newSvDiscounted, pricingModel: newSvPricingModel, sortOrder: s.subVariants.length },
      ],
    }));
    setNewSvLabel("");
    setNewSvDescription("");
    setNewSvBase(0);
    setNewSvDiscounted(0);
    setNewSvPricingModel("FIXED");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit variant" : "New variant"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input placeholder="60 min" value={v.label} onChange={e => setV(s => ({ ...s, label: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input placeholder="60" value={v.value} onChange={e => setV(s => ({ ...s, value: e.target.value }))} />
            </div>
          </div>

          {serviceType === "B2C" && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">Pricing</p>
              <div className="grid grid-cols-1 gap-3 items-end sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Base price (₹)</Label>
                  <Input type="number" min={0} value={v.basePrice} onChange={e => setV(s => ({ ...s, basePrice: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Discounted (₹)</Label>
                  <Input type="number" min={0} value={v.discountedPrice} onChange={e => setV(s => ({ ...s, discountedPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <div className="flex h-9 items-center rounded-btn border border-base-300 bg-base-200 px-3 text-sm font-mono">
                    {discountPct > 0 ? `${discountPct}%` : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Label>Pricing model</Label>
                <Select value={v.pricingModel ?? "FIXED"} onValueChange={(p) => setV(s => ({ ...s, pricingModel: p as "FIXED" | "INSPECTION" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input type="number" value={v.sortOrder} onChange={e => setV(s => ({ ...s, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">What&apos;s included</p>
            <EditableList
              isEmpty={v.inclusions.length === 0}
              emptyMessage="No inclusions yet. Add what this variant covers below."
            >
              {v.inclusions.map((inc, i) => (
                <EditableListItem
                  key={i}
                  icon={Check}
                  title={inc.title}
                  description={inc.description || undefined}
                  onRemove={() =>
                    setV((s) => ({
                      ...s,
                      inclusions: s.inclusions.filter((_, idx) => idx !== i),
                    }))
                  }
                  removeLabel={`Remove inclusion ${inc.title}`}
                />
              ))}
            </EditableList>
            <EditableListAddPanel className="mt-2">
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Title (e.g. Vacuuming all rooms)"
                  value={newIncTitle}
                  onChange={e => setNewIncTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addInclusion(); }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Description (optional)"
                    value={newIncDesc}
                    onChange={e => setNewIncDesc(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addInclusion} disabled={!newIncTitle.trim()}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            </EditableListAddPanel>
          </div>

          {serviceType === "B2B" && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">Sub-variants (B2B tiers)</p>
              <EditableList
                isEmpty={v.subVariants.length === 0}
                emptyMessage="No sub-variants yet. Add B2B pricing tiers below."
              >
                {v.subVariants.map((sv, i) => {
                  const svDiscountPct = computeDiscountPct(sv.basePrice, sv.discountedPrice);
                  return (
                    <EditableListRow
                      key={i}
                      onRemove={() =>
                        setV((s) => ({
                          ...s,
                          subVariants: s.subVariants.filter((_, idx) => idx !== i),
                        }))
                      }
                      removeLabel={`Remove sub-variant ${sv.label}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{sv.label}</p>
                        {sv.pricingModel && (
                          <Badge variant="muted" className="text-[10px] px-1.5 py-0">
                            {sv.pricingModel}
                          </Badge>
                        )}
                      </div>
                      {sv.description && (
                        <p className="mt-0.5 text-xs text-base-content/60">{sv.description}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="num text-xs font-mono">{inr(String(sv.discountedPrice))}</span>
                        {svDiscountPct > 0 && (
                          <>
                            <span className="num text-xs font-mono line-through text-base-content/50">
                              {inr(String(sv.basePrice))}
                            </span>
                            <Badge variant="signal" className="px-1.5 py-0 text-[10px]">
                              {svDiscountPct}% off
                            </Badge>
                          </>
                        )}
                      </div>
                    </EditableListRow>
                  );
                })}
              </EditableList>
              <EditableListAddPanel className="mt-2 space-y-2">
                  <Input placeholder="Label (e.g. Up to 1000 sq ft)" value={newSvLabel} onChange={e => setNewSvLabel(e.target.value)} />
                  <Input placeholder="Description (optional)" value={newSvDescription} onChange={e => setNewSvDescription(e.target.value)} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Base price (₹)</Label>
                      <Input type="number" min={0} value={newSvBase} onChange={e => setNewSvBase(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discounted (₹)</Label>
                      <Input type="number" min={0} value={newSvDiscounted} onChange={e => setNewSvDiscounted(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discount</Label>
                      <div className="flex h-9 items-center rounded-btn border border-base-300 bg-base-200 px-3 text-xs font-mono">
                        {computeDiscountPct(newSvBase, newSvDiscounted) > 0 ? `${computeDiscountPct(newSvBase, newSvDiscounted)}%` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pricing model</Label>
                    <Select value={newSvPricingModel} onValueChange={(p) => setNewSvPricingModel(p as "FIXED" | "INSPECTION")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICING_MODELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addSubVariant} disabled={!newSvLabel.trim()}>
                    <Plus className="h-4 w-4" /> Add sub-variant
                  </Button>
              </EditableListAddPanel>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="signal" onClick={() => onSave(v)} disabled={saving || !v.label.trim() || !v.value.trim()}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Addon dialog ───────────────────────────────────────────────────
type AddonDraft = { name: string; description: string; price: number; discountedPrice: number; sortOrder: number };
const emptyAddon: AddonDraft = { name: "", description: "", price: 0, discountedPrice: 0, sortOrder: 0 };

function AddonDialog({
  open, onClose, initial, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: AddonDraft | null;
  onSave: (a: AddonDraft) => void;
  saving: boolean;
}) {
  const [a, setA] = useState<AddonDraft>(initial ?? emptyAddon);
  useEffect(() => { if (open) setA(initial ?? emptyAddon); }, [open, initial]);
  const isEdit = !!initial;
  const discountPct = computeDiscountPct(a.price, a.discountedPrice);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit add-on" : "New add-on"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Bathroom cleaning" value={a.name} onChange={e => setA(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={a.description} onChange={e => setA(s => ({ ...s, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-3 items-end sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" min={0} value={a.price} onChange={e => setA(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Discounted (₹)</Label>
              <Input type="number" min={0} value={a.discountedPrice} onChange={e => setA(s => ({ ...s, discountedPrice: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <div className="flex h-9 items-center rounded-btn border border-base-300 bg-base-200 px-3 text-sm font-mono">
                {discountPct > 0 ? `${discountPct}%` : "—"}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input type="number" value={a.sortOrder} onChange={e => setA(s => ({ ...s, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="signal" onClick={() => onSave(a)} disabled={saving || !a.name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add add-on"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Service overview edit dialog ───────────────────────────────────
type ServiceDraft = {
  name: string; tagline: string; description: string;
  imageUrl: string; sortOrder: number; serviceType: "B2C" | "B2B";
};

function ServiceEditDialog({
  open, onClose, initial, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: ServiceDraft;
  onSave: (v: ServiceDraft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<ServiceDraft>(initial);
  useEffect(() => { if (open) setD(initial); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit service</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={d.name} onChange={e => setD(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={d.tagline} onChange={e => setD(s => ({ ...s, tagline: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={d.description} onChange={e => setD(s => ({ ...s, description: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={d.imageUrl}
              onChange={e => setD(s => ({ ...s, imageUrl: e.target.value }))}
              placeholder="https://example.com/image.png"
            />
          </div>
          <div className="space-y-2">
            <Label>Service type</Label>
            <Select value={d.serviceType} onValueChange={(t) => setD(s => ({ ...s, serviceType: t as "B2C" | "B2B" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B2C">B2C – Consumer</SelectItem>
                <SelectItem value="B2B">B2B – Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input type="number" value={d.sortOrder} onChange={e => setD(s => ({ ...s, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="signal" onClick={() => onSave(d)} disabled={saving || !d.name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────
function ServiceDetailContent({
  id,
  showBackLink = true,
}: {
  id: string;
  showBackLink?: boolean;
}) {
  const queryClient = useQueryClient();

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => servicesApi.get(id),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones"],
    queryFn: () => zonesApi.list(),
  });

  const assignedZoneIds = useMemo(
    () =>
      zones
        .filter((zone) =>
          zone.services?.some(
            (entry) => entry.serviceId === id && entry.isAvailable,
          ),
        )
        .map((zone) => zone.id),
    [zones, id],
  );

  // ── Dialog state ──
  const [variantDialog, setVariantDialog] = useState<{ open: boolean; editing: ServiceVariant | null }>({ open: false, editing: null });
  const [addonDialog, setAddonDialog] = useState<{ open: boolean; editing: ServiceAddon | null }>({ open: false, editing: null });
  const [serviceDialog, setServiceDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Single mutation: PATCH the service with a partial payload.
  const patchService = useMutation({
    mutationFn: (patch: ServicePatch) => servicesApi.update(id, patch),
    onSuccess: (updated) => queryClient.setQueryData(["service", id], updated),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to update service")),
  });

  // ── Variant CRUD via PATCH ──
  const saveVariant = (v: VariantDraft) => {
    if (!service) return;
    const next = variantDialog.editing
      ? service.variants.map((x) =>
          x.id === variantDialog.editing!.id
            ? { ...toVariantPayload(x), ...v }
            : toVariantPayload(x),
        )
      : [...service.variants.map(toVariantPayload), { ...v }];
    patchService.mutate(
      { variants: next },
      {
        onSuccess: () => {
          toast.success(variantDialog.editing ? "Variant updated" : "Variant added");
          setVariantDialog({ open: false, editing: null });
        },
      },
    );
  };
  const deleteVariant = (variantId: string) => {
    if (!service) return;
    const next = service.variants.filter((v) => v.id !== variantId).map(toVariantPayload);
    patchService.mutate({ variants: next }, { onSuccess: () => toast.success("Variant removed") });
  };

  // ── Addon CRUD via PATCH ──
  const saveAddon = (a: AddonDraft) => {
    if (!service) return;
    const payload = { name: a.name, description: a.description || null, price: a.price, discountedPrice: a.discountedPrice, sortOrder: a.sortOrder };
    const next = addonDialog.editing
      ? service.addons.map((x) =>
          x.id === addonDialog.editing!.id
            ? { ...toAddonPayload(x), ...payload }
            : toAddonPayload(x),
        )
      : [...service.addons.map(toAddonPayload), payload];
    patchService.mutate(
      { addons: next },
      {
        onSuccess: () => {
          toast.success(addonDialog.editing ? "Add-on updated" : "Add-on added");
          setAddonDialog({ open: false, editing: null });
        },
      },
    );
  };
  const deleteAddon = (addonId: string) => {
    if (!service) return;
    const next = service.addons.filter((a) => a.id !== addonId).map(toAddonPayload);
    patchService.mutate({ addons: next }, { onSuccess: () => toast.success("Add-on removed") });
  };

  // ── Service overview mutation ──
  const saveService = (d: ServiceDraft) => {
    patchService.mutate(
      { ...d, imageUrl: d.imageUrl.trim() || null },
      {
        onSuccess: () => {
          toast.success("Service updated");
          setServiceDialog(false);
        },
      },
    );
  };

  const confirmAndDelete = (label: string, fn: () => void) => {
    if (typeof window !== "undefined" && window.confirm(`Delete ${label}?`)) fn();
  };

  if (isLoading || !service) {
    return (
      <PageStack density="compact">
        {showBackLink && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/services"><ArrowLeft className="h-4 w-4" /> Back to services</Link>
          </Button>
        )}
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </PageStack>
    );
  }

  return (
    <PageStack density="compact">
      {showBackLink && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/services"><ArrowLeft className="h-4 w-4" /> Back to services</Link>
        </Button>
      )}

      <PageHeader
        eyebrow="Catalogue · Service Detail"
        title={service.name}
        description={service.tagline ?? "Edit pricing, variants, add-ons and inclusions for this service."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setServiceDialog(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <RoleGate allow="superAdmin">
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => confirmAndDelete("this service", () => {
                  setIsDeleting(true);
                  servicesApi.remove(id)
                    .then(() => { toast.success("Service deleted"); })
                    .catch((error) =>
                      toast.error(getApiErrorMessage(error, "Failed to delete service")),
                    )
                    .finally(() => setIsDeleting(false));
                })}
              >
                {isDeleting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />
                }
              </Button>
            </RoleGate>
          </div>
        }
      />

      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Overview</CardTitle>
              <p className="text-sm opacity-60">Pricing model and visibility.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={service.serviceType === "B2B" ? "muted" : "signal"}>{service.serviceType}</Badge>
              <Badge variant={service.isActive ? "signal" : "muted"}>
                {service.isActive ? "Active" : "Hidden"}
              </Badge>
              <div className="flex items-center gap-2 text-sm">
                <Switch
                  checked={service.isActive}
                  disabled={patchService.isPending}
                  onCheckedChange={(checked) =>
                    patchService.mutate(
                      { isActive: checked },
                      {
                        onSuccess: () =>
                          toast.success(
                            checked ? "Service is now visible" : "Service hidden from catalogue",
                          ),
                      },
                    )
                  }
                />
                <span className="text-xs opacity-60">Visible in app</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <Label className="text-xs opacity-60">Sort</Label>
              <div className="mt-1 font-mono">{service.sortOrder}</div>
            </div>
            <div>
              <Label className="text-xs opacity-60">Variants · Add-ons</Label>
              <div className="mt-1 font-mono">{service.variants.length} · {service.addons.length}</div>
            </div>
            {service.imageUrl && (
              <div className="sm:col-span-2">
                <Label className="text-xs opacity-60">Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={service.imageUrl} alt={service.name} className="h-16 w-16 rounded-box bg-base-200 object-contain" />
                  <span className="break-all font-mono text-xs opacity-60">{service.imageUrl}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Variants</CardTitle>
              <p className="text-sm opacity-60">
                Each variant is a pricing option (e.g. duration, BHK size, employee count).
              </p>
            </div>
            <Button variant="signal" size="sm" onClick={() => setVariantDialog({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Add variant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {service.variants.length === 0 ? (
            <EditableListEmpty message="No variants yet. Add a pricing option to get started." />
          ) : (
            <EditableList>
              {service.variants
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((v) => (
                  <EditableListRow
                    key={v.id}
                    align="center"
                    onEdit={() => setVariantDialog({ open: true, editing: v })}
                    editLabel={`Edit variant ${v.label}`}
                    onRemove={() =>
                      confirmAndDelete(`variant "${v.label}"`, () => deleteVariant(v.id))
                    }
                    removeLabel={`Delete variant ${v.label}`}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <div className="text-sm font-medium">{v.label}</div>
                      <span className="font-mono text-[10px] text-base-content/55">{v.value}</span>
                      {service.serviceType === "B2B" && (v.subVariants?.length ?? 0) > 0 && (
                        <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                          {v.subVariants?.length} tiers
                        </Badge>
                      )}
                      {(v.inclusions?.length ?? 0) > 0 && (
                        <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                          {v.inclusions?.length} incl.
                        </Badge>
                      )}
                      {service.serviceType === "B2C" && v.pricingModel && (
                        <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                          {v.pricingModel}
                        </Badge>
                      )}
                    </div>
                    {service.serviceType === "B2C" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="num font-mono text-sm">{inr(v.discountedPrice)}</span>
                        {v.discountPercentage > 0 && (
                          <>
                            <span className="num font-mono text-xs line-through text-base-content/50">
                              {inr(v.basePrice)}
                            </span>
                            <Badge variant="signal" className="px-1.5 py-0 text-[10px]">
                              {v.discountPercentage}% off
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                  </EditableListRow>
                ))}
            </EditableList>
          )}
        </CardContent>
      </Card>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Add-ons</CardTitle>
              <p className="text-sm opacity-60">Optional extras consumers can stack onto a booking.</p>
            </div>
            <Button variant="signal" size="sm" onClick={() => setAddonDialog({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Add add-on
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {service.addons.length === 0 ? (
            <EditableListEmpty message="No add-ons yet. Optional extras can be added from the button above." />
          ) : (
            <EditableList>
              {service.addons
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((a) => (
                  <EditableListRow
                    key={a.id}
                    align="center"
                    onEdit={() => setAddonDialog({ open: true, editing: a })}
                    editLabel={`Edit add-on ${a.name}`}
                    onRemove={() =>
                      confirmAndDelete(`add-on "${a.name}"`, () => deleteAddon(a.id))
                    }
                    removeLabel={`Delete add-on ${a.name}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.name}</div>
                      {a.description && (
                        <div className="text-xs text-base-content/60">{a.description}</div>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="num font-mono text-sm">{inr(a.discountedPrice)}</span>
                      {a.discountPercentage > 0 && (
                        <span className="num font-mono text-xs line-through text-base-content/50">
                          {inr(a.price)}
                        </span>
                      )}
                    </div>
                  </EditableListRow>
                ))}
            </EditableList>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <RegionalCoverage
            serviceId={id}
            assignedZoneIds={assignedZoneIds}
            onUpdate={() => {
              void queryClient.invalidateQueries({ queryKey: ["zones"] });
            }}
          />
        </CardContent>
      </Card>

      {/* Service Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Service Parameters</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">Parameter</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">Value</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { param: "Min booking lead time", type: "Duration", value: "2 hours", status: "Active" },
                { param: "Max reschedule count", type: "Integer", value: "3", status: "Active" },
                { param: "Cancellation window", type: "Duration", value: "24 hours", status: "Active" },
                { param: "Peak hour surcharge", type: "Percentage", value: "15%", status: "Paused" },
              ].map((row) => (
                <TableRow key={row.param}>
                  <TableCell className="px-4 py-3 font-medium">{row.param}</TableCell>
                  <TableCell className="px-4 py-3 opacity-60">{row.type}</TableCell>
                  <TableCell className="px-4 py-3 font-mono">{row.value}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={row.status === "Active" ? "signal" : "muted"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <VariantDialog
        open={variantDialog.open}
        onClose={() => setVariantDialog({ open: false, editing: null })}
        initial={variantDialog.editing ? {
          label: variantDialog.editing.label,
          value: variantDialog.editing.value,
          basePrice: parseFloat(variantDialog.editing.basePrice),
          discountedPrice: parseFloat(variantDialog.editing.discountedPrice ?? variantDialog.editing.basePrice),
          pricingModel: variantDialog.editing.pricingModel,
          sortOrder: variantDialog.editing.sortOrder,
          inclusions: (variantDialog.editing.inclusions ?? []).map((inc) => ({
            id: inc.id,
            title: inc.title,
            description: inc.description ?? "",
          })),
          subVariants: (variantDialog.editing.subVariants ?? []).map((sv) => ({
            id: sv.id,
            label: sv.label,
            description: sv.description ?? "",
            basePrice: parseFloat(sv.basePrice),
            discountedPrice: parseFloat(sv.discountedPrice),
            pricingModel: sv.pricingModel,
            sortOrder: sv.sortOrder,
          })),
        } : null}
        onSave={saveVariant}
        saving={patchService.isPending}
        serviceType={service.serviceType}
      />
      <AddonDialog
        open={addonDialog.open}
        onClose={() => setAddonDialog({ open: false, editing: null })}
        initial={addonDialog.editing ? {
          name: addonDialog.editing.name,
          description: addonDialog.editing.description ?? "",
          price: parseFloat(addonDialog.editing.price),
          discountedPrice: parseFloat(addonDialog.editing.discountedPrice ?? addonDialog.editing.price),
          sortOrder: addonDialog.editing.sortOrder,
        } : null}
        onSave={saveAddon}
        saving={patchService.isPending}
      />
      <ServiceEditDialog
        open={serviceDialog}
        onClose={() => setServiceDialog(false)}
        initial={{
          name: service.name,
          tagline: service.tagline ?? "",
          description: service.description ?? "",
          imageUrl: service.imageUrl ?? "",
          sortOrder: service.sortOrder,
          serviceType: service.serviceType,
        }}
        onSave={saveService}
        saving={patchService.isPending}
      />
    </PageStack>
  );
}

export default function ServiceDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } =
    typeof (params as { then?: unknown }).then === "function"
      ? use(params)
      : (params as unknown as { id: string });

  return <ServiceDetailContent id={id} />;
}
