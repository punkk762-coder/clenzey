"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { DisputeStatusFilters } from "@/components/disputes/DisputeStatusFilters";
import { DisputesTable } from "@/components/disputes/DisputesTable";
import { FilterBar } from "@/components/ui/filter-bar";
import { FilterField } from "@/components/ui/filter-field";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { ErrorState } from "@/components/ui/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { disputesApi } from "@/lib/api/disputes";
import { usePagination } from "@/hooks/usePagination";
import type { DisputeStatus, DisputeCategory } from "@/types";

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

const DISPUTE_CATEGORIES: DisputeCategory[] = [
  "SERVICE_QUALITY",
  "PRICING",
  "NO_SHOW",
  "DAMAGE",
  "OTHER",
];

const CATEGORY_LABEL: Record<DisputeCategory, string> = {
  SERVICE_QUALITY: "Service quality",
  PRICING: "Pricing",
  NO_SHOW: "No show",
  DAMAGE: "Damage",
  OTHER: "Other",
};

export default function DisputesListPage() {
  const [status, setStatus] = useState<"" | DisputeStatus>("");
  const [category, setCategory] = useState<"" | DisputeCategory>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (category) params.category = category;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [status, category, startDate, endDate]);

  const pagination = usePagination({
    totalCount,
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  useEffect(() => {
    pagination.resetToFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, startDate, endDate]);

  const { data: disputesResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["disputes", filterParams, pagination.page, pagination.pageSize],
    queryFn: () =>
      disputesApi.list({
        ...filterParams,
        limit: pagination.limit,
        offset: pagination.offset,
      }),
  });

  useEffect(() => {
    if (disputesResponse) {
      setTotalCount(disputesResponse.total);
    }
  }, [disputesResponse]);

  const disputes = Array.isArray(disputesResponse?.data) ? disputesResponse.data : [];

  return (
    <PageStack>
      <PageHeader
        variant="compact"
        eyebrow="Operations · Disputes"
        title="Resolution hub"
        description="Review, triage, and resolve customer disputes. Use status and category filters to focus on what needs attention."
      />

      <DisputeStatusFilters value={status} onChange={setStatus} />

      <FilterBar resultCount={totalCount} resultLabel="dispute" className="gap-4 p-4">
        <FilterField label="Category">
          <Select
            value={category === "" ? "ALL" : category}
            onValueChange={(v) => setCategory(v === "ALL" ? "" : (v as DisputeCategory))}
          >
            <SelectTrigger className="w-[11rem] text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {DISPUTE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Date range">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => {
              setStartDate(null);
              setEndDate(null);
            }}
          />
        </FilterField>
      </FilterBar>

      {isError ? (
        <div className="card admin-table-card">
          <ErrorState
            message="Failed to load disputes"
            onRetry={() => refetch()}
          />
        </div>
      ) : (
        <DataTableWrapper
          isLoading={isLoading}
          isEmpty={!isLoading && disputes.length === 0}
          isError={false}
          columns={7}
          emptyMessage="No disputes match the current filters"
          onRetry={() => refetch()}
        >
          <DisputesTable disputes={disputes} onUpdate={() => refetch()} />

          {totalCount > 0 && (
            <PaginationFooter
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={totalCount}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              itemLabel="disputes"
            />
          )}
        </DataTableWrapper>
      )}
    </PageStack>
  );
}
