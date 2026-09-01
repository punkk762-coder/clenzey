"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { formControlClass } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

type SelectPosition = {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
};

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder?: string;
  items: Map<string, string>;
  registerItem: (itemValue: string, label: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select");
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

function getSelectPosition(
  trigger: HTMLButtonElement,
  menuHeight = 240,
): SelectPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

  if (openAbove) {
    return {
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      width: rect.width,
    };
  }

  return {
    left: rect.left,
    top: rect.bottom + 4,
    width: rect.width,
  };
}

function Select({
  value,
  onValueChange,
  defaultValue,
  disabled,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [items, setItems] = React.useState(new Map<string, string>());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const current = value ?? internalValue;

  const registerItem = React.useCallback((itemValue: string, label: string) => {
    setItems((prev) => {
      const next = new Map(prev);
      next.set(itemValue, label);
      return next;
    });
  }, []);

  const handleChange = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [value, onValueChange],
  );

  return (
    <SelectContext.Provider
      value={{
        value: current,
        onValueChange: handleChange,
        open: disabled ? false : open,
        setOpen: disabled ? () => {} : setOpen,
        items,
        registerItem,
        triggerRef,
      }}
    >
      <div className="relative" data-select-root>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

const SelectGroup = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

function SelectValue({
  placeholder,
  children,
}: {
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const { value, items } = useSelect();
  const label = value ? items.get(value) : undefined;
  if (children) return <span>{children}</span>;
  return <span>{label ?? placeholder ?? "Select…"}</span>;
}

const selectControlClass = formControlClass;

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useSelect();
  return (
    <button
      ref={mergeRefs(ref, triggerRef)}
      type="button"
      className={cn(
        selectControlClass,
        "flex items-center justify-between text-left",
        className,
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      }}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { disablePortal?: boolean }
>(({ className, children, disablePortal = false, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useSelect();
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<SelectPosition | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    if (disablePortal || !triggerRef.current) return;
    const menuHeight = contentRef.current?.offsetHeight ?? 240;
    setPosition(getSelectPosition(triggerRef.current, menuHeight));
  }, [disablePortal, triggerRef]);

  React.useLayoutEffect(() => {
    if (!open || disablePortal) {
      if (!open) setPosition(null);
      return;
    }
    updatePosition();
  }, [open, disablePortal, updatePosition]);

  React.useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-select-root]") ||
        target.closest("[data-select-content]")
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onScrollOrResize = () => {
      updatePosition();
    };

    const frame = window.requestAnimationFrame(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKeyDown);
      if (!disablePortal) {
        window.addEventListener("resize", onScrollOrResize);
        window.addEventListener("scroll", onScrollOrResize, true);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKeyDown);
      if (!disablePortal) {
        window.removeEventListener("resize", onScrollOrResize);
        window.removeEventListener("scroll", onScrollOrResize, true);
      }
    };
  }, [open, setOpen, updatePosition, disablePortal]);

  if (!open) return null;
  if (!disablePortal && !mounted) return null;

  const resolvedPosition =
    disablePortal || !triggerRef.current
      ? null
      : (position ?? getSelectPosition(triggerRef.current));

  if (!disablePortal && !resolvedPosition) return null;

  const menu = (
    <div
      ref={mergeRefs(ref, contentRef)}
      data-select-content
      role="listbox"
      style={
        disablePortal
          ? undefined
          : {
              position: "fixed",
              left: resolvedPosition!.left,
              top: resolvedPosition!.top,
              bottom: resolvedPosition!.bottom,
              width: resolvedPosition!.width,
              zIndex: 1000,
            }
      }
      className={cn(
        "max-h-60 overflow-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-lg",
        disablePortal && "absolute left-0 right-0 top-full z-[1000] mt-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );

  if (disablePortal) return menu;
  return createPortal(menu, document.body);
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, children, value: itemValue, ...props }, ref) => {
  const { value, onValueChange, registerItem } = useSelect();
  const label = typeof children === "string" ? children : itemValue;

  React.useEffect(() => {
    registerItem(itemValue, label);
  }, [itemValue, label, registerItem]);

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={value === itemValue}
      className={cn(
        "flex w-full cursor-pointer items-center rounded-btn px-3 py-2 text-left text-sm hover:bg-base-200",
        value === itemValue && "bg-primary/10 font-medium",
        className,
      )}
      onClick={() => onValueChange?.(itemValue)}
      {...props}
    >
      {children}
    </button>
  );
});
SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  selectControlClass,
};
