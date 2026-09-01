import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function PageStack({
  children,
  className,
  density = "default",
}: {
  children: ReactNode;
  className?: string;
  /** `default` for list pages, `compact` for detail pages */
  density?: "default" | "compact";
}) {
  return (
    <div
      className={cn(
        density === "compact" ? "page-stack-compact" : "page-stack",
        className,
      )}
    >
      {children}
    </div>
  );
}
