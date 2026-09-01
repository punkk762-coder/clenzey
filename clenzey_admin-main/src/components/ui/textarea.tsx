import * as React from "react";

import { textareaControlClass } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(textareaControlClass, className)}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea, textareaControlClass };
