import type { ReactNode } from "react";

import { formControlClass } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

type InputGroupProps = {
  children: ReactNode;
  className?: string;
};

function InputGroup({ children, className }: InputGroupProps) {
  return (
    <label className={cn(formControlClass, "flex items-center gap-2", className)}>
      {children}
    </label>
  );
}

export { InputGroup };
