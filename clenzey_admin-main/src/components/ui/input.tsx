import * as React from "react";

import {
  formControlClass,
  formControlCompactClass,
} from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

/** @deprecated Use `formControlClass` from `@/components/ui/form-controls`. */
const inputControlClass = formControlClass;

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { compact?: boolean }
>(({ className, type, compact = false, ...props }, ref) => (
  <input
    type={type}
    className={cn(compact ? formControlCompactClass : formControlClass, className)}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input, inputControlClass, formControlClass, formControlCompactClass };
