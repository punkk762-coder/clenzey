"use client";

import { AlertTriangle, CircleDot, CheckCircle2, Search } from "lucide-react";

import { PillTabs } from "@/components/ui/pill-tabs";
import type { DisputeStatus } from "@/types";

const STATUS_OPTIONS = [
  {
    value: "" as const,
    label: "All",
    icon: CircleDot,
    activeClass: "border-base-content/20 bg-base-200 text-base-content shadow-sm",
  },
  {
    value: "OPEN" as const,
    label: "Open",
    icon: AlertTriangle,
    activeClass: "border-warning/40 bg-warning/10 text-warning shadow-sm",
  },
  {
    value: "UNDER_REVIEW" as const,
    label: "Under review",
    icon: Search,
    activeClass: "border-primary/40 bg-primary/10 text-primary shadow-sm",
  },
  {
    value: "RESOLVED" as const,
    label: "Resolved",
    icon: CheckCircle2,
    activeClass: "border-success/40 bg-success/10 text-success shadow-sm",
  },
  {
    value: "CLOSED" as const,
    label: "Closed",
    icon: CircleDot,
    activeClass:
      "border-base-content/20 bg-base-200 text-base-content/70 shadow-sm",
  },
] satisfies Array<{
  value: "" | DisputeStatus;
  label: string;
  icon: typeof CircleDot;
  activeClass: string;
}>;

interface DisputeStatusFiltersProps {
  value: "" | DisputeStatus;
  onChange: (value: "" | DisputeStatus) => void;
  className?: string;
}

export function DisputeStatusFilters({
  value,
  onChange,
  className,
}: DisputeStatusFiltersProps) {
  return (
    <PillTabs
      value={value}
      onChange={onChange}
      options={STATUS_OPTIONS}
      className={className}
      ariaLabel="Filter by dispute status"
    />
  );
}
