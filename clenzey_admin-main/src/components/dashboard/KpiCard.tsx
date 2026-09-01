import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface KpiCardProps {
  label: string;
  value?: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  change?: number;
  subtitle?: string;
  children?: ReactNode;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  change,
  subtitle,
  children,
}: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="card admin-kpi-card">
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/55">
              {label}
            </p>

            <p className="text-3xl font-bold leading-none tracking-tight">
              {value !== undefined && value !== null ? value : "—"}
            </p>

            {change !== undefined && change !== 0 && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-xs",
                  isPositive && "text-success",
                  isNegative && "text-error",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {change}%
                </span>
              </div>
            )}

            {subtitle && (
              <p className="text-xs text-base-content/55">{subtitle}</p>
            )}
          </div>

          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg,
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
