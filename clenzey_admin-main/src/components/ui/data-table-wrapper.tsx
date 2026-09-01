"use client";

import { ReactNode } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableWrapperProps {
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  columns: number;
  emptyMessage?: string;
  onRetry?: () => void;
}

function DataTableWrapper({
  children,
  isLoading = false,
  isEmpty = false,
  isError = false,
  columns,
  emptyMessage = "No results found",
  onRetry,
}: DataTableWrapperProps) {
  return (
    <div className="card admin-table-card">
      <div className="card-body p-0">
        {isLoading ? (
          <SkeletonRows columns={columns} />
        ) : isError ? (
          <ErrorState message="Failed to load data" onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState heading={emptyMessage} subtext="Try adjusting your filters" />
        ) : (
          <div className="overflow-x-auto">{children}</div>
        )}
      </div>
    </div>
  );
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { DataTableWrapper };
export type { DataTableWrapperProps };
