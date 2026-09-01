import * as React from "react";

import { cn } from "@/lib/utils/cn";

type BadgeVariant =
  | "default"
  | "signal"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "muted";

type BadgeSize = "xs" | "sm" | "default";

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-primary",
  signal: "badge-primary badge-outline border-primary/40 bg-primary/10 text-primary",
  secondary: "badge-secondary",
  outline: "badge-outline",
  success: "badge-success",
  warning: "badge-warning",
  destructive: "badge-error",
  muted: "badge-ghost bg-base-200 text-base-content/70",
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: "badge-xs min-h-5 px-1.5 py-0 text-[10px]",
  sm: "badge-sm min-h-6 px-2 py-0.5 text-xs",
  default: "badge-sm min-h-6 px-2.5 py-1 text-xs",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  uppercase?: boolean;
}

function Badge({
  className,
  variant = "default",
  size = "default",
  uppercase = false,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "badge inline-flex h-auto items-center justify-center gap-1 font-medium leading-snug",
        sizeClasses[size],
        variantClasses[variant],
        uppercase && "uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
