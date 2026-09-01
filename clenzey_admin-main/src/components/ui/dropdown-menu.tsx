"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
};

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu must be used within DropdownMenu");
  return ctx;
}

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else ref.current = node;
    }
  };
}

function getDropdownPosition(
  trigger: HTMLElement,
  menuWidth: number,
): DropdownPosition {
  const rect = trigger.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

  return {
    left,
    top: rect.bottom + 8,
    width: menuWidth,
  };
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block" data-dropdown-root>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { open, setOpen, triggerRef } = useDropdown();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void;
      ref?: React.Ref<HTMLElement>;
      "aria-expanded"?: boolean;
      "aria-haspopup"?: boolean | "menu";
    }>;

    return React.cloneElement(child, {
      ref: mergeRefs(child.props.ref, triggerRef),
      "aria-expanded": open,
      "aria-haspopup": true,
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      },
    });
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      aria-expanded={open}
      aria-haspopup
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  className,
  children,
  align = "end",
}: {
  className?: string;
  children: React.ReactNode;
  align?: "start" | "end";
  sideOffset?: number;
}) {
  const { open, setOpen, triggerRef } = useDropdown();
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const contentRef = React.useRef<HTMLUListElement>(null);
  const menuWidth = 208;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const next = getDropdownPosition(triggerRef.current, menuWidth);
    if (align === "start") {
      next.left = triggerRef.current.getBoundingClientRect().left;
    }
    setPosition(next);
  }, [align, triggerRef]);

  React.useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    const onDoc = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-dropdown-root]") ||
        target.closest("[data-dropdown-content]")
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onScrollOrResize = () => {
      updatePosition();
    };

    const frame = window.requestAnimationFrame(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", onScrollOrResize);
      window.addEventListener("scroll", onScrollOrResize, true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, setOpen, updatePosition]);

  if (!open || !mounted) return null;

  const resolvedPosition =
    position ??
    (triggerRef.current ? getDropdownPosition(triggerRef.current, menuWidth) : null);

  if (!resolvedPosition) return null;

  const menu = (
    <ul
      ref={contentRef}
      data-dropdown-content
      role="menu"
      style={{
        position: "fixed",
        left: resolvedPosition.left,
        top: resolvedPosition.top,
        width: resolvedPosition.width,
        zIndex: 1000,
      }}
      className={cn(
        "menu rounded-box border border-base-300 bg-base-100 p-2 shadow-lg",
        className,
      )}
    >
      {children}
    </ul>
  );

  return createPortal(menu, document.body);
}

function DropdownMenuItem({
  className,
  inset,
  children,
  onClick,
  ...props
}: React.LiHTMLAttributes<HTMLLIElement> & { inset?: boolean }) {
  const { setOpen } = useDropdown();
  return (
    <li
      role="menuitem"
      className={cn(inset && "pl-4", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
      {...props}
    >
      <a>{children}</a>
    </li>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { inset?: boolean }) {
  return (
    <li className={cn("menu-title", inset && "pl-4", className)}>
      <span {...props} />
    </li>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <li className={cn("divider my-1 h-0", className)} />;
}

const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const DropdownMenuRadioGroup = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
};
