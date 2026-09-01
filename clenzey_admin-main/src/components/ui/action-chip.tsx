import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type ActionChipVariant = "warning" | "error" | "info" | "success";

const variantClasses: Record<ActionChipVariant, string> = {
  warning:
    "border-warning bg-warning text-warning-content hover:brightness-95",
  error: "border-error bg-error text-error-content hover:brightness-95",
  info: "border-info bg-info text-info-content hover:brightness-95",
  success:
    "border-success bg-success text-success-content hover:brightness-95",
};

export interface ActionChipProps {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  variant?: ActionChipVariant;
  className?: string;
}

export function ActionChip({
  href,
  icon: Icon,
  children,
  variant = "warning",
  className,
}: ActionChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
        variantClasses[variant],
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
