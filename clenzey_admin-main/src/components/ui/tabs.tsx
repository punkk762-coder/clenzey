"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within Tabs");
  return ctx;
}

function Tabs({
  value: controlledValue,
  onValueChange,
  defaultValue = "",
  className,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = controlledValue ?? uncontrolled;

  const setValue = React.useCallback(
    (next: string) => {
      if (controlledValue === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn("tabs tabs-bordered", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value: tabValue, onClick, ...props }, ref) => {
  const { value, setValue } = useTabs();
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      className={cn("tab", value === tabValue && "tab-active", className)}
      onClick={(e) => {
        setValue(tabValue);
        onClick?.(e);
      }}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value: tabValue, ...props }, ref) => {
  const { value } = useTabs();
  if (value !== tabValue) return null;
  return (
    <div ref={ref} role="tabpanel" className={cn("mt-4", className)} {...props} />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
