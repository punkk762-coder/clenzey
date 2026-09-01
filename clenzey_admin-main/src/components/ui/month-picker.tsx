"use client";

import { useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { formControlClass } from "@/components/ui/form-controls";
import { useAnchoredPopover } from "@/hooks/useAnchoredPopover";
import { cn } from "@/lib/utils/cn";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
};

function parseMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;

  return { year, month };
}

function toMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatDisplay(value: string): string {
  const parsed = parseMonth(value);
  if (!parsed) return value;

  return format(new Date(parsed.year, parsed.month - 1, 1), "MMM yyyy");
}

function currentMonthValue(): string {
  const now = new Date();
  return toMonthValue(now.getFullYear(), now.getMonth() + 1);
}

function isMonthWithinBounds(
  value: string,
  min?: string,
  max?: string,
): boolean {
  if (min && value < min) return false;
  if (max && value > max) return false;
  return true;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Pick a month",
  className,
  id,
  min,
  max,
  disabled = false,
  "aria-invalid": ariaInvalid = false,
}: MonthPickerProps) {
  const reactId = useId().replace(/:/g, "");
  const inputId = id ?? `month-picker-${reactId}`;
  const popoverId = `${inputId}-popover`;
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useAnchoredPopover(triggerRef, popoverRef);

  const [viewYear, setViewYear] = useState(() => {
    const parsed = parseMonth(value);
    return parsed?.year ?? new Date().getFullYear();
  });

  const thisMonth = currentMonthValue();
  const canSelectThisMonth = isMonthWithinBounds(thisMonth, min, max);

  useEffect(() => {
    const parsed = parseMonth(value);
    if (parsed) setViewYear(parsed.year);
  }, [value]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const syncViewYear = () => {
      const parsed = parseMonth(value);
      setViewYear(parsed?.year ?? new Date().getFullYear());
    };

    popover.addEventListener("toggle", syncViewYear);
    return () => popover.removeEventListener("toggle", syncViewYear);
  }, [value]);

  const closePopover = () => popoverRef.current?.hidePopover();

  const handleClear = () => {
    onChange("");
    closePopover();
  };

  const handleThisMonth = () => {
    if (!canSelectThisMonth) return;
    onChange(thisMonth);
    closePopover();
  };

  const handleSelectMonth = (month: number) => {
    const nextValue = toMonthValue(viewYear, month);
    if (!isMonthWithinBounds(nextValue, min, max)) return;

    onChange(nextValue);
    closePopover();
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={inputId}
        disabled={disabled}
        popoverTarget={popoverId}
        aria-invalid={ariaInvalid || undefined}
        className={cn(
          formControlClass,
          "flex items-center justify-between gap-2 text-left",
          !value && "opacity-70",
          disabled && "btn-disabled cursor-not-allowed opacity-50",
          ariaInvalid && "input-error",
          className,
        )}
      >
        <span className="truncate">
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      <div
        ref={popoverRef}
        popover="auto"
        id={popoverId}
        className="admin-month-picker-popover fixed z-50 rounded-box border border-base-300 bg-base-100 p-0 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-base-300 px-3 py-2">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square h-7 min-h-7 w-7"
            aria-label="Previous year"
            onClick={() => setViewYear((year) => year - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square h-7 min-h-7 w-7"
            aria-label="Next year"
            onClick={() => setViewYear((year) => year + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 p-3">
          {MONTH_LABELS.map((label, index) => {
            const month = index + 1;
            const monthValue = toMonthValue(viewYear, month);
            const isSelected = value === monthValue;
            const isDisabled = !isMonthWithinBounds(monthValue, min, max);

            return (
              <button
                key={label}
                type="button"
                disabled={isDisabled}
                className={cn(
                  "btn btn-sm h-9 min-h-9 rounded-lg px-2 text-sm font-medium",
                  isSelected
                    ? "btn-primary text-primary-content"
                    : "btn-ghost hover:bg-base-200",
                  isDisabled && "btn-disabled opacity-40",
                )}
                onClick={() => handleSelectMonth(month)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-base-300 px-3 py-2">
          <button
            type="button"
            className="btn btn-ghost btn-xs h-7 min-h-7 px-2 text-primary"
            onClick={handleClear}
            disabled={!value}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs h-7 min-h-7 px-2 text-primary"
            onClick={handleThisMonth}
            disabled={!canSelectThisMonth}
          >
            This month
          </button>
        </div>
      </div>
    </>
  );
}
