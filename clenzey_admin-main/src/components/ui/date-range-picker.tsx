"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DatePicker } from "@/components/ui/date-picker";

export interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  onClear: () => void;
  error?: string | null;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  error,
  className,
}: DateRangePickerProps) {
  const validationError = React.useMemo(() => {
    if (startDate && endDate && endDate < startDate) {
      return "End date must be on or after start date";
    }
    return null;
  }, [startDate, endDate]);

  const displayError = error || validationError;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          value={startDate ?? ""}
          onChange={(date) => onStartDateChange(date || null)}
          placeholder="From date"
          className={cn("w-[160px]", displayError && "input-error")}
          max={endDate ?? undefined}
        />
        <span className="text-xs opacity-50">to</span>
        <DatePicker
          value={endDate ?? ""}
          onChange={(date) => onEndDateChange(date || null)}
          placeholder="To date"
          className={cn("w-[160px]", displayError && "input-error")}
          min={startDate ?? undefined}
        />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost btn-xs h-9 min-h-9 gap-1 px-2"
            aria-label="Clear date range"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      {displayError && (
        <p className="text-xs text-error" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
