"use client";

import * as React from "react";
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
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils/cn";
import type { AreaPricingTier } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AreaPricingMatrixProps {
  tiers: AreaPricingTier[];
  onChange: (tiers: AreaPricingTier[]) => void;
  errors?: string[];
}

// ── Default Tiers ─────────────────────────────────────────────────────────────

export const DEFAULT_TIERS: AreaPricingTier[] = [
  { label: "Studio", minSqFt: 0, maxSqFt: 500, rateType: "FLAT", rate: 0.01 },
  {
    label: "Standard",
    minSqFt: 501,
    maxSqFt: 2000,
    rateType: "PER_SQFT",
    rate: 0.01,
  },
  {
    label: "Premium",
    minSqFt: 2001,
    maxSqFt: null,
    rateType: "PER_SQFT",
    rate: 0.01,
  },
];

// ── Validation ────────────────────────────────────────────────────────────────

export interface TierValidationError {
  index: number;
  messages: string[];
}

/**
 * Validates area pricing tiers.
 * Rules:
 * - Tiers must be sorted by minSqFt ascending
 * - Contiguous: tier[i].maxSqFt + 1 === tier[i+1].minSqFt
 * - No overlaps
 * - Rate >= 0.01
 * - Upper boundary > lower boundary (when maxSqFt is not null)
 */
export function validateTiers(tiers: AreaPricingTier[]): TierValidationError[] {
  const errors: TierValidationError[] = [];

  if (tiers.length === 0) return errors;

  // Sort check + per-tier validation
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierErrors: string[] = [];

    // Rate >= 0.01
    if (tier.rate < 0.01) {
      tierErrors.push("Rate must be at least 0.01");
    }

    // Upper > lower when not open-ended
    if (tier.maxSqFt !== null && tier.maxSqFt <= tier.minSqFt) {
      tierErrors.push("Upper boundary must be greater than lower boundary");
    }

    // Sort order check
    if (i > 0 && tier.minSqFt <= tiers[i - 1].minSqFt) {
      tierErrors.push("Tiers must be sorted by minimum sq ft (ascending)");
    }

    // Contiguity check (gap or overlap with previous tier)
    if (i > 0) {
      const prevTier = tiers[i - 1];
      if (prevTier.maxSqFt === null) {
        tierErrors.push(
          "Previous tier has no upper boundary — cannot be contiguous",
        );
      } else if (prevTier.maxSqFt + 1 !== tier.minSqFt) {
        if (prevTier.maxSqFt + 1 > tier.minSqFt) {
          tierErrors.push("Overlaps with previous tier");
        } else {
          tierErrors.push("Gap between this tier and the previous tier");
        }
      }
    }

    if (tierErrors.length > 0) {
      errors.push({ index: i, messages: tierErrors });
    }
  }

  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AreaPricingMatrix({
  tiers,
  onChange,
  errors: externalErrors,
}: AreaPricingMatrixProps) {
  const validationErrors = React.useMemo(() => validateTiers(tiers), [tiers]);

  // Build an error map by index for quick lookup
  const errorsByIndex = React.useMemo(() => {
    const map = new Map<number, string[]>();
    for (const err of validationErrors) {
      map.set(err.index, err.messages);
    }
    return map;
  }, [validationErrors]);

  const updateTier = (index: number, patch: Partial<AreaPricingTier>) => {
    const updated = tiers.map((tier, i) =>
      i === index ? { ...tier, ...patch } : tier,
    );
    onChange(updated);
  };

  const handleNumericChange = (
    index: number,
    field: "minSqFt" | "maxSqFt" | "rate",
    rawValue: string,
  ) => {
    if (field === "maxSqFt") {
      if (rawValue === "" || rawValue === "null") {
        updateTier(index, { maxSqFt: null });
        return;
      }
      const parsed = parseInt(rawValue, 10);
      if (!isNaN(parsed)) {
        updateTier(index, { maxSqFt: parsed });
      }
      return;
    }

    if (field === "rate") {
      const parsed = parseFloat(rawValue);
      if (!isNaN(parsed)) {
        updateTier(index, { rate: parsed });
      } else if (rawValue === "") {
        updateTier(index, { rate: 0 });
      }
      return;
    }

    // minSqFt
    const parsed = parseInt(rawValue, 10);
    if (!isNaN(parsed)) {
      updateTier(index, { minSqFt: parsed });
    } else if (rawValue === "") {
      updateTier(index, { minSqFt: 0 });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Area-wise Pricing Matrix Visualizer
        </h3>
      </div>

      {/* External errors (from parent form) */}
      {externalErrors && externalErrors.length > 0 && (
        <Alert variant="error">
          {externalErrors.map((err, i) => (
            <p key={i} className="text-xs">
              {err}
            </p>
          ))}
        </Alert>
      )}

      {/* Tier Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier, index) => {
          const tierErrors = errorsByIndex.get(index);
          const hasError = Boolean(tierErrors && tierErrors.length > 0);

          return (
            <Card
              key={index}
              className={cn(
                "transition-colors",
                hasError && "border-error ring-1 ring-error/30",
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tier {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Label */}
                <div className="space-y-1.5">
                  <Label htmlFor={`tier-label-${index}`}>Label</Label>
                  <Input
                    id={`tier-label-${index}`}
                    value={tier.label}
                    onChange={(e) =>
                      updateTier(index, { label: e.target.value })
                    }
                    placeholder="Tier name"
                  />
                </div>

                {/* Min Sq Ft */}
                <div className="space-y-1.5">
                  <Label htmlFor={`tier-min-${index}`}>Min Sq Ft</Label>
                  <Input
                    id={`tier-min-${index}`}
                    type="number"
                    min={0}
                    step={1}
                    value={tier.minSqFt}
                    onChange={(e) =>
                      handleNumericChange(index, "minSqFt", e.target.value)
                    }
                  />
                </div>

                {/* Max Sq Ft */}
                <div className="space-y-1.5">
                  <Label htmlFor={`tier-max-${index}`}>Max Sq Ft</Label>
                  <Input
                    id={`tier-max-${index}`}
                    type="number"
                    min={1}
                    step={1}
                    value={tier.maxSqFt ?? ""}
                    placeholder="Open-ended"
                    onChange={(e) =>
                      handleNumericChange(index, "maxSqFt", e.target.value)
                    }
                  />
                  <p className="text-[10px] opacity-60">
                    Leave empty for open-ended (e.g. 2001+)
                  </p>
                </div>

                {/* Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor={`tier-rate-${index}`}>Rate (₹)</Label>
                  <Input
                    id={`tier-rate-${index}`}
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={tier.rate}
                    onChange={(e) =>
                      handleNumericChange(index, "rate", e.target.value)
                    }
                  />
                </div>

                {/* Rate Type */}
                <div className="space-y-1.5">
                  <Label>Rate Type</Label>
                  <Select
                    value={tier.rateType}
                    onValueChange={(val) =>
                      updateTier(index, {
                        rateType: val as "FLAT" | "PER_SQFT",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat Rate</SelectItem>
                      <SelectItem value="PER_SQFT">Per Sq Ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Inline error indicators */}
                {hasError && (
                  <div className="rounded-box bg-error/10 p-2">
                    {tierErrors!.map((msg, i) => (
                      <p
                        key={i}
                        className="text-xs text-error"
                      >
                        {msg}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
