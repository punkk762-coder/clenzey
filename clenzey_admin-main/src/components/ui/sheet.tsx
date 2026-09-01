"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error("Sheet components must be used within Sheet");
  return ctx;
}

function Sheet({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useSheet();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      { onClick: () => setOpen(true) },
    );
  }

  return (
    <button type="button" className="btn" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function SheetClose({
  children,
  asChild,
}: {
  children?: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useSheet();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      { onClick: () => setOpen(false) },
    );
  }

  return (
    <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={() => setOpen(false)}>
      {children ?? <X className="h-4 w-4" />}
    </button>
  );
}

function SheetPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

const SheetOverlay = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("fixed inset-0 z-50 bg-black/50", className)} {...props} />
);

type SheetSide = "top" | "bottom" | "left" | "right";

const sideClasses: Record<SheetSide, string> = {
  top: "top-0 left-0 right-0",
  bottom: "bottom-0 left-0 right-0",
  left: "top-0 left-0 h-full",
  right: "top-0 right-0 h-full",
};

function SheetContent({
  side = "right",
  className,
  children,
}: {
  side?: SheetSide;
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useSheet();

  if (!open) return null;

  return (
    <SheetPortal>
      <SheetOverlay onClick={() => setOpen(false)} />
      <div
        className={cn(
          "fixed z-[60] flex flex-col bg-base-100 shadow-xl",
          sideClasses[side],
          side === "left" || side === "right" ? "w-80 max-w-[85vw]" : "w-full",
          className,
        )}
      >
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-2 p-6 pb-0", className)} {...props} />
  );
}

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-xl font-bold", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm opacity-70", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
