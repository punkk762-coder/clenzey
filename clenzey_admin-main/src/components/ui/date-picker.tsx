"use client";

import { useEffect, useId, useRef } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar } from "lucide-react";
import "cally";

import { formControlClass } from "@/components/ui/form-controls";
import { useAnchoredPopover } from "@/hooks/useAnchoredPopover";
import { cn } from "@/lib/utils/cn";

export type DatePickerProps = {
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

function formatDisplay(value: string): string {
  if (!value) return "";
  const date = parseISO(value);
  return isValid(date) ? format(date, "dd MMM yyyy") : value;
}

const CalendarNavIcons = () => (
  <>
    <svg
      aria-label="Previous month"
      className="size-4 fill-current"
      slot="previous"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
    <svg
      aria-label="Next month"
      className="size-4 fill-current"
      slot="next"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  </>
);

function todayValue(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function isWithinBounds(date: string, min?: string, max?: string): boolean {
  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  id,
  min,
  max,
  disabled = false,
  "aria-invalid": ariaInvalid = false,
}: DatePickerProps) {
  const reactId = useId().replace(/:/g, "");
  const inputId = id ?? `date-picker-${reactId}`;
  const popoverId = `${inputId}-popover`;

  const calendarRef = useRef<HTMLElement & { value: string }>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const today = todayValue();
  const canSelectToday = isWithinBounds(today, min, max);

  useAnchoredPopover(triggerRef, popoverRef);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleChange = () => {
      onChange(calendar.value);
      popoverRef.current?.hidePopover();
    };

    calendar.addEventListener("change", handleChange);
    return () => calendar.removeEventListener("change", handleChange);
  }, [onChange]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar || calendar.value === value) return;
    calendar.value = value;
  }, [value]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;
    if (min) calendar.setAttribute("min", min);
    else calendar.removeAttribute("min");
    if (max) calendar.setAttribute("max", max);
    else calendar.removeAttribute("max");
  }, [min, max]);

  const closePopover = () => popoverRef.current?.hidePopover();

  const handleClear = () => {
    onChange("");
    closePopover();
  };

  const handleToday = () => {
    if (!canSelectToday) return;
    onChange(today);
    closePopover();
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
        className="admin-date-picker-popover fixed z-50 rounded-box border border-base-300 bg-base-100 p-0 shadow-lg"
      >
        <calendar-date ref={calendarRef} className="cally" locale="en-GB">
          <CalendarNavIcons />
          <calendar-month />
        </calendar-date>
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
            onClick={handleToday}
            disabled={!canSelectToday}
          >
            Today
          </button>
        </div>
      </div>
    </>
  );
}
