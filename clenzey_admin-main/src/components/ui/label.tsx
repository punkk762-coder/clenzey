import * as React from "react";

import { formLabelClass } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(formLabelClass, className)} {...props} />
));
Label.displayName = "Label";

export { Label };
