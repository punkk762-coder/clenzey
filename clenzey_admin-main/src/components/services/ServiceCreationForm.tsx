"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PricingTabs } from "@/components/services/PricingTabs";
import { AreaPricingMatrix, DEFAULT_TIERS } from "@/components/services/AreaPricingMatrix";
import { servicesApi } from "@/lib/api/services";
import type { AddonInput, VariantInput } from "@/lib/api/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { AreaPricingTier } from "@/types";

// ── Zod Validation Schema ──────────────────────────────────────────────────────

const serviceFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  tagline: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  serviceType: z.enum(["B2C", "B2B"]),
  sortOrder: z.coerce.number().int().min(0).default(0),
  pricingModel: z.enum(["FIXED", "INSPECTION", "VISIT_BASED", "AREA_WISE"]),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

function buildInitialVariants(
  model: ServiceFormValues["pricingModel"],
  pricingValues: Record<string, number>,
  areaTiers: AreaPricingTier[],
): VariantInput[] {
  switch (model) {
    case "FIXED": {
      const price = pricingValues.fixedBasePrice ?? 0;
      if (price <= 0) return [];
      return [{
        label: "Standard",
        value: "standard",
        basePrice: price,
        discountedPrice: price,
        pricingModel: "FIXED",
        sortOrder: 0,
      }];
    }
    case "INSPECTION": {
      const price = pricingValues.inspectionBaseFee ?? 0;
      if (price <= 0) return [];
      return [{
        label: "Inspection",
        value: "inspection",
        basePrice: price,
        discountedPrice: price,
        pricingModel: "INSPECTION",
        sortOrder: 0,
      }];
    }
    case "VISIT_BASED": {
      const price = pricingValues.visitPricePerVisit ?? 0;
      if (price <= 0) return [];
      return [{
        label: "Per visit",
        value: "visit",
        basePrice: price,
        discountedPrice: price,
        pricingModel: "FIXED",
        sortOrder: 0,
      }];
    }
    case "AREA_WISE": {
      const tier = areaTiers.find((item) => item.rate > 0) ?? areaTiers[0];
      if (!tier || tier.rate <= 0) return [];
      const price =
        tier.rateType === "FLAT"
          ? tier.rate
          : tier.rate * Math.max(tier.minSqFt, 500);
      return [{
        label: tier.label,
        value: tier.label.toLowerCase().replace(/\s+/g, "-"),
        basePrice: price,
        discountedPrice: price,
        pricingModel: "FIXED",
        sortOrder: 0,
      }];
    }
    default:
      return [];
  }
}

function buildInitialAddons(
  model: ServiceFormValues["pricingModel"],
  pricingValues: Record<string, number>,
): AddonInput[] {
  if (model !== "INSPECTION") return [];
  const price = pricingValues.inspectionComplexAddon ?? 0;
  if (price <= 0) return [];
  return [{
    name: "Complex report add-on",
    price,
    discountedPrice: price,
    sortOrder: 0,
  }];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ServiceCreationForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();

  // Pricing configuration state
  const [pricingValues, setPricingValues] = React.useState<Record<string, number>>({});
  const [areaTiers, setAreaTiers] = React.useState<AreaPricingTier[]>(DEFAULT_TIERS);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      imageUrl: "",
      serviceType: "B2C",
      sortOrder: 0,
      pricingModel: "FIXED",
    },
  });

  const selectedPricingModel = watch("pricingModel");

  const handlePricingModelChange = (model: string) => {
    setValue("pricingModel", model as ServiceFormValues["pricingModel"]);
  };

  const handlePricingValueChange = (key: string, value: number) => {
    setPricingValues((prev) => ({ ...prev, [key]: value }));
  };

  const createMutation = useMutation({
    mutationFn: (data: ServiceFormValues) => {
      const { pricingModel, ...serviceData } = data;
      return servicesApi.create({
        ...serviceData,
        imageUrl: serviceData.imageUrl || null,
        variants: buildInitialVariants(pricingModel, pricingValues, areaTiers),
        addons: buildInitialAddons(pricingModel, pricingValues),
      });
    },
    onSuccess: (newService) => {
      toast.success("Service created successfully");
      onCancel?.();
      router.push(`/services/${newService.id}`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create service"));
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Section 01: Service Definition ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">01 — Service Definition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Deep Cleaning"
              disabled={createMutation.isPending}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Short marketing tagline"
              disabled={createMutation.isPending}
              {...register("tagline")}
            />
            {errors.tagline && (
              <p className="text-xs text-error">
                {errors.tagline.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the service in detail"
              rows={4}
              disabled={createMutation.isPending}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-error">{errors.description.message}</p>
            )}
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/image.png"
              disabled={createMutation.isPending}
              {...register("imageUrl")}
            />
            {errors.imageUrl && (
              <p className="text-xs text-error">
                {errors.imageUrl.message}
              </p>
            )}
          </div>

          {/* Service Type + Sort Order */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Service Type */}
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Controller
                name="serviceType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2C">B2C</SelectItem>
                      <SelectItem value="B2B">B2B</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.serviceType && (
                <p className="text-xs text-error">
                  {errors.serviceType.message}
                </p>
              )}
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                disabled={createMutation.isPending}
                {...register("sortOrder")}
              />
              {errors.sortOrder && (
                <p className="text-xs text-error">
                  {errors.sortOrder.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 02: Pricing Model Configuration ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            02 — Pricing Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pricing Model Select */}
          <div className="space-y-2">
            <Label>Pricing Model *</Label>
            <Controller
              name="pricingModel"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Fee</SelectItem>
                    <SelectItem value="INSPECTION">Inspection-Based</SelectItem>
                    <SelectItem value="VISIT_BASED">Visit Based</SelectItem>
                    <SelectItem value="AREA_WISE">Area Wise</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.pricingModel && (
              <p className="text-xs text-error">
                {errors.pricingModel.message}
              </p>
            )}
          </div>

          {/* Pricing Tabs Configuration */}
          <PricingTabs
            selectedModel={selectedPricingModel}
            onModelChange={handlePricingModelChange}
            values={pricingValues}
            onChange={handlePricingValueChange}
          />

          {/* Area Pricing Matrix (shown when Area Wise is selected) */}
          {selectedPricingModel === "AREA_WISE" && (
            <AreaPricingMatrix
              tiers={areaTiers}
              onChange={setAreaTiers}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Section 03: Regional Coverage ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">03 — Regional Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm opacity-70">
            Zone availability is configured on the service detail page after creation,
            once geofences exist in the catalogue.
          </p>
        </CardContent>
      </Card>

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="signal"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {createMutation.isPending ? "Creating…" : "Create Service"}
        </Button>
      </div>
    </form>
  );
}
