import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "card bg-base-100 shadow-sm transition-colors relative",
        accent && "bg-gradient-to-br from-base-100 to-primary/5",
      )}
    >
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              {label}
            </div>
            <div className="num text-3xl font-bold leading-none tracking-tight">
              {value}
            </div>
          </div>
          {Icon && (
            <Icon
              className={cn(
                "h-5 w-5 transition-colors",
                accent ? "text-primary" : "opacity-60",
              )}
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em]",
                delta.positive ? "text-success" : "text-error",
              )}
            >
              {delta.positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {delta.value}
            </span>
          ) : (
            <span />
          )}
          {hint && (
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
              {hint}
            </span>
          )}
        </div>

        {accent && (
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        )}
      </div>
    </div>
  );
}
