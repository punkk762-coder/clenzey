import * as React from "react";

import { cn } from "@/lib/utils/cn";

import { formActionButtonClass } from "@/components/ui/form-controls";

type ButtonVariant =
  | "default"
  | "signal"
  | "destructive"
  | "warning"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "btn-primary",
  signal: "btn-primary",
  destructive: "btn-error",
  warning: "btn-warning",
  outline: "btn-outline",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  link: "btn-link",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: formActionButtonClass,
  sm: formActionButtonClass,
  lg: "btn-lg !rounded-lg",
  icon: "btn-square btn-sm h-9 min-h-9 w-9 !rounded-lg",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild, ...props }, ref) => {
    const classes = cn(
      "btn",
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (asChild && React.isValidElement<{ className?: string }>(props.children)) {
      const child = props.children;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return <button className={classes} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button };
