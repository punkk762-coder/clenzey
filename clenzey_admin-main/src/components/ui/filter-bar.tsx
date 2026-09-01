import * as React from "react";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface FilterBarProps {
  children: React.ReactNode;
  resultCount?: number;
  resultLabel?: string;
  className?: string;
}

function FilterBar({ children, resultCount, resultLabel, className }: FilterBarProps) {
  const label = resultLabel ?? "result";
  const pluralized = resultCount === 1 ? label : `${label}s`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Filter className="h-4 w-4 opacity-60" />
        <span className="text-xs font-semibold text-base-content/55">
          Filters
        </span>
      </div>

      {children}

      {resultCount !== undefined && (
        <span className="ml-auto text-xs font-medium text-base-content/55">
          {resultCount} {pluralized}
        </span>
      )}
    </div>
  );
}

export { FilterBar };
export type { FilterBarProps };
