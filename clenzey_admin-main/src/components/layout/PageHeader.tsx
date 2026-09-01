import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

function parseEyebrow(eyebrow: string): string[] {
  return eyebrow
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  variant = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  variant?: "default" | "compact";
}) {
  const crumbs = eyebrow ? parseEyebrow(eyebrow) : [];
  const isCompact = variant === "compact";

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-sm",
        isCompact ? "px-5 py-4 sm:px-6" : "px-5 py-6 sm:px-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-primary"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-2 pl-2">
          {crumbs.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb}-${index}`} className="flex items-center gap-2">
                    {index > 0 && (
                      <span aria-hidden className="opacity-40">
                        /
                      </span>
                    )}
                    <span>{crumb}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className={cn("space-y-1", !isCompact && "space-y-2")}>
            <h1
              className={cn(
                "font-bold tracking-tight",
                isCompact ? "text-xl sm:text-2xl" : "text-2xl sm:text-[1.75rem]",
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "max-w-2xl leading-relaxed text-base-content/70",
                  isCompact ? "text-sm" : "text-sm sm:text-[0.9375rem]",
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 pl-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
