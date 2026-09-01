"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Switch = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, onChange, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn("toggle toggle-primary", className)}
    checked={checked}
    onChange={(e) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    }}
    {...props}
  />
));
Switch.displayName = "Switch";

export { Switch };
