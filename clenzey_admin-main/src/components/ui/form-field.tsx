import type { ReactNode } from "react";

import { formErrorClass, formFieldClass, formLabelClass } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type FormFieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

function FormField({
  label,
  htmlFor,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn(formFieldClass, className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {error ? <p className={formErrorClass}>{error}</p> : null}
    </div>
  );
}

function FormFieldAction({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(formFieldClass, className)}>
      <span className={cn(formLabelClass, "invisible select-none")} aria-hidden="true">
        Action
      </span>
      {children}
    </div>
  );
}

export { FormField, FormFieldAction };
