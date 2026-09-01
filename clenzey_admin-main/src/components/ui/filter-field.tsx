import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface FilterFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/55">
        {label}
      </span>
      {children}
    </label>
  );
}
