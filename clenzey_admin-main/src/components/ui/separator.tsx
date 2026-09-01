import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      orientation === "horizontal" ? "divider" : "divider divider-horizontal",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
