import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type StatusDotVariant = "success" | "warning" | "error" | "muted";

const dotClasses: Record<StatusDotVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  muted: "bg-base-content/30",
};

export interface StatusDotProps {
  variant?: StatusDotVariant;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({
  variant = "muted",
  pulse = false,
  className,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        dotClasses[variant],
        pulse && variant === "success" && "signal-dot",
        className,
      )}
      aria-hidden
    />
  );
}

export interface StatusLabelProps {
  variant?: StatusDotVariant;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

export function StatusLabel({
  variant = "muted",
  pulse = false,
  children,
  className,
}: StatusLabelProps) {
  const textClasses: Record<StatusDotVariant, string> = {
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    muted: "text-base-content/70",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        textClasses[variant],
        className,
      )}
    >
      <StatusDot variant={variant} pulse={pulse} />
      {children}
    </span>
  );
}
