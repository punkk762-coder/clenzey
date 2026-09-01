import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  heading: string;
  subtext?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  heading,
  subtext,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("py-16 text-center", className)}>
      {Icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-200">
          <Icon className="h-5 w-5 text-base-content/40" />
        </div>
      )}
      <p className="text-sm font-medium text-base-content/70">{heading}</p>
      {subtext && (
        <p className="mt-1 text-xs text-base-content/45">{subtext}</p>
      )}
    </div>
  );
}
