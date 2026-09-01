"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within Dialog");
  return ctx;
}

function Dialog({
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
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useDialog();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      {
        onClick: () => setOpen(true),
      },
    );
  }

  return (
    <button type="button" className="btn" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function DialogClose({
  children,
  asChild,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = useDialog();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      { onClick: () => setOpen(false) },
    );
  }

  return (
    <button
      type="button"
      className={cn("btn btn-sm btn-circle btn-ghost", className)}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  );
}

const DialogPortal = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const DialogOverlay = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("fixed inset-0 z-[999] bg-black/50", className)}
    {...props}
  />
);

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useDialog();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const scrollContainer = document.querySelector<HTMLElement>(".drawer-content");
    const main = document.querySelector<HTMLElement>(".drawer-content main");
    const prevScrollOverflow = scrollContainer?.style.overflow ?? "";
    const prevMainOverflow = main?.style.overflow ?? "";

    if (scrollContainer) scrollContainer.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (scrollContainer) scrollContainer.style.overflow = prevScrollOverflow;
      if (main) main.style.overflow = prevMainOverflow;
    };
  }, [open, setOpen]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] grid place-items-center bg-black/50 p-4"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-lg max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto",
          "rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        {...props}
      >
        {children}
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
});
DialogContent.displayName = "DialogContent";

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4 flex flex-col space-y-1.5 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("modal-action mt-4 flex justify-end gap-2", className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-bold", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm opacity-70", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
