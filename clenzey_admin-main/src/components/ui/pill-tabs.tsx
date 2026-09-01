"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type PillTabOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Tailwind classes applied when this tab is active */
  activeClass?: string;
  count?: number | string;
};

interface PillTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly PillTabOption<T>[];
  className?: string;
  ariaLabel?: string;
}

const defaultActiveClass =
  "border-primary/40 bg-primary/10 text-primary shadow-sm";
const defaultInactiveClass =
  "border-base-300 bg-base-100 text-base-content/70 hover:border-base-content/20 hover:bg-base-200 hover:text-base-content";

export function PillTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: PillTabsProps<T>) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              isActive
                ? (option.activeClass ?? defaultActiveClass)
                : defaultInactiveClass,
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-base-100/60" : "bg-base-200 text-base-content/50",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
