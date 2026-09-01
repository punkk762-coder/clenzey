"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  formatShowingLabel,
  getPaginationItems,
} from "@/lib/pagination";
import { cn } from "@/lib/utils/cn";

export interface PaginationFooterProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

const navButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content disabled:pointer-events-none disabled:opacity-35";

const pageButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";

export function PaginationFooter({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  itemLabel = "entries",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  className,
}: PaginationFooterProps) {
  const pageItems = getPaginationItems(page, totalPages);
  const showingLabel = formatShowingLabel(page, pageSize, totalCount, itemLabel);
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const showPageControls = totalPages > 1;
  const showPageSizeSelect =
    onPageSizeChange != null && pageSizeOptions.length > 1;
  const showControls = showPageControls || showPageSizeSelect;

  if (!showControls) {
    return (
      <div
        className={cn(
          "border-t border-base-300 bg-base-100 px-4 py-3.5 sm:px-6",
          className,
        )}
      >
        <p className="text-sm text-base-content/60">{showingLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t border-base-300 bg-base-100 px-4 py-3.5 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-base-content/60">{showingLabel}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {showPageSizeSelect && (
            <label className="flex items-center justify-between gap-3 sm:justify-start">
              <span className="text-sm text-base-content/60 whitespace-nowrap">
                Rows per page
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger
                  className="h-8 w-[4.75rem] min-h-0 px-2.5 text-sm"
                  aria-label="Rows per page"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          {showPageControls && (
            <nav
              aria-label="Pagination"
              className={cn(
                "flex items-center justify-center gap-0.5",
                showPageSizeSelect && "sm:border-l sm:border-base-300 sm:pl-4",
              )}
            >
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={!canGoPrev}
                className={cn(navButtonClass, "hidden sm:inline-flex")}
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={!canGoPrev}
                className={navButtonClass}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="mx-1 hidden items-center gap-0.5 sm:flex">
                {pageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className={cn(pageButtonClass, "text-base-content/40")}
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPageChange(item)}
                      className={cn(
                        pageButtonClass,
                        item === page
                          ? "bg-primary text-primary-content shadow-sm"
                          : "text-base-content/70 hover:bg-base-200 hover:text-base-content",
                      )}
                      aria-label={`Page ${item}`}
                      aria-current={item === page ? "page" : undefined}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>

              <span className="min-w-[5.5rem] px-2 text-center text-sm font-medium text-base-content/70 sm:hidden">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={!canGoNext}
                className={navButtonClass}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={!canGoNext}
                className={cn(navButtonClass, "hidden sm:inline-flex")}
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
