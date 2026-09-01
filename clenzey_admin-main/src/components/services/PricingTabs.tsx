"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PricingTabsProps {
  selectedModel: "FIXED" | "INSPECTION" | "VISIT_BASED" | "AREA_WISE";
  onModelChange: (model: string) => void;
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

const TAB_MAP: Record<PricingTabsProps["selectedModel"], string> = {
  FIXED: "fixed",
  INSPECTION: "inspection",
  VISIT_BASED: "visit-based",
  AREA_WISE: "area-wise",
};

const MODEL_MAP: Record<string, PricingTabsProps["selectedModel"]> = {
  fixed: "FIXED",
  inspection: "INSPECTION",
  "visit-based": "VISIT_BASED",
  "area-wise": "AREA_WISE",
};

export function PricingTabs({
  selectedModel,
  onModelChange,
  values,
  onChange,
}: PricingTabsProps) {
  const handleTabChange = (value: string) => {
    const model = MODEL_MAP[value];
    if (model) {
      onModelChange(model);
    }
  };

  const handleNumericChange = (key: string, rawValue: string) => {
    const parsed = parseFloat(rawValue);
    if (!isNaN(parsed)) {
      onChange(key, parsed);
    } else if (rawValue === "") {
      onChange(key, 0);
    }
  };

  return (
    <Tabs value={TAB_MAP[selectedModel]} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="fixed">Fixed Fee</TabsTrigger>
        <TabsTrigger value="inspection">Inspection-Based</TabsTrigger>
        <TabsTrigger value="visit-based">Visit Based</TabsTrigger>
        <TabsTrigger value="area-wise">Area Wise</TabsTrigger>
      </TabsList>

      {/* Fixed Fee Tab */}
      <TabsContent value="fixed">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fixedBasePrice">Base Price</Label>
            <Input
              id="fixedBasePrice"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={values.fixedBasePrice ?? ""}
              onChange={(e) =>
                handleNumericChange("fixedBasePrice", e.target.value)
              }
            />
          </div>
        </div>
      </TabsContent>

      {/* Inspection-Based Tab */}
      <TabsContent value="inspection">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inspectionBaseFee">Base Inspection Fee</Label>
            <Input
              id="inspectionBaseFee"
              type="number"
              min={0.01}
              step="0.01"
              placeholder="0.01"
              value={values.inspectionBaseFee ?? ""}
              onChange={(e) =>
                handleNumericChange("inspectionBaseFee", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectionComplexAddon">
              Complex Report Add-on
            </Label>
            <Input
              id="inspectionComplexAddon"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={values.inspectionComplexAddon ?? ""}
              onChange={(e) =>
                handleNumericChange("inspectionComplexAddon", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectionRegionalOverhead">
              Regional Overhead ({values.inspectionRegionalOverhead ?? 0}%)
            </Label>
            <input
              id="inspectionRegionalOverhead"
              type="range"
              min={0}
              max={100}
              step={1}
              value={values.inspectionRegionalOverhead ?? 0}
              onChange={(e) =>
                onChange("inspectionRegionalOverhead", Number(e.target.value))
              }
              className="range range-primary range-xs w-full"
            />
            <div className="flex justify-between text-xs opacity-60">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectionUrgencyMultiplier">
              Urgency Multiplier (
              {(values.inspectionUrgencyMultiplier ?? 1.0).toFixed(1)}x)
            </Label>
            <input
              id="inspectionUrgencyMultiplier"
              type="range"
              min={1.0}
              max={5.0}
              step={0.1}
              value={values.inspectionUrgencyMultiplier ?? 1.0}
              onChange={(e) =>
                onChange(
                  "inspectionUrgencyMultiplier",
                  Number(e.target.value),
                )
              }
              className="range range-primary range-xs w-full"
            />
            <div className="flex justify-between text-xs opacity-60">
              <span>1.0x</span>
              <span>5.0x</span>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Visit Based Tab */}
      <TabsContent value="visit-based">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visitPricePerVisit">Price Per Visit</Label>
            <Input
              id="visitPricePerVisit"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={values.visitPricePerVisit ?? ""}
              onChange={(e) =>
                handleNumericChange("visitPricePerVisit", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitMinimumVisits">Minimum Visits</Label>
            <Input
              id="visitMinimumVisits"
              type="number"
              min={1}
              step="1"
              placeholder="1"
              value={values.visitMinimumVisits ?? ""}
              onChange={(e) =>
                handleNumericChange("visitMinimumVisits", e.target.value)
              }
            />
          </div>
        </div>
      </TabsContent>

      {/* Area Wise Tab */}
      <TabsContent value="area-wise">
        <p className="text-sm opacity-60">
          Configure in Area Pricing Matrix below
        </p>
      </TabsContent>
    </Tabs>
  );
}
