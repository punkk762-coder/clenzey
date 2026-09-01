import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

type AlertVariant = "default" | "info" | "success" | "warning" | "error";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-base-300 bg-base-100 text-base-content",
  info: "border-info bg-info text-info-content",
  success: "border-success bg-success text-success-content",
  warning: "border-warning bg-warning text-warning-content",
  error: "border-error bg-error text-error-content",
};

const variantIcons: Record<AlertVariant, LucideIcon | null> = {
  default: null,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  icon?: LucideIcon | false;
  action?: React.ReactNode;
}

function Alert({
  className,
  variant = "default",
  icon,
  action,
  children,
  ...props
}: AlertProps) {
  const Icon =
    icon === false ? null : (icon ?? variantIcons[variant] ?? null);

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { Alert };
export type { AlertVariant };
