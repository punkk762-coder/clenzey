"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { reviewsApi } from "@/lib/api/reviews";
import { usePagination } from "@/hooks/usePagination";
import type { ReviewFilter } from "@/types";

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export default function ReviewsPage() {
  // Filter state
  const [partnerName, setPartnerName] = useState("");
  const [consumerName, setConsumerName] = useState("");
  const [minRating, setMinRating] = useState<string>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Build API filter params (without pagination)
  const filterParams = useMemo(() => {
    const params: Partial<ReviewFilter> = {};
    if (partnerName.trim()) params.partnerName = partnerName.trim();
    if (consumerName.trim()) params.consumerName = consumerName.trim();
    if (minRating) params.minRating = Number(minRating);
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [partnerName, consumerName, minRating, startDate, endDate]);

  // Track total count from last successful response for pagination
  const [totalCount, setTotalCount] = useState(0);

  // Pagination hook
  const pagination = usePagination({
    totalCount,
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  // Reset to page 1 on any filter change
  useEffect(() => {
    pagination.resetToFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerName, consumerName, minRating, startDate, endDate]);

  // Fetch reviews with pagination
  const {
    data: reviewsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["reviews", filterParams, pagination.page, pagination.pageSize],
    queryFn: () =>
      reviewsApi.list({
        ...filterParams,
        limit: pagination.limit,
        offset: pagination.offset,
      }),
  });

  useEffect(() => {
    if (reviewsResponse) {
      setTotalCount(reviewsResponse.total);
    }
  }, [reviewsResponse]);

  const reviews = Array.isArray(reviewsResponse?.data) ? reviewsResponse.data : [];

  return (
    <PageStack>
      <PageHeader
        eyebrow="Network · Reviews"
        title="Reviews"
        description="Browse and filter customer reviews across partners. Monitor service quality and identify patterns."
      />

      {/* Filter bar */}
      <FilterBar resultCount={totalCount} resultLabel="review">
        {/* Partner name filter */}
        <Input
          placeholder="Partner name"
          className="w-[180px]"
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
        />

        {/* Consumer name filter */}
        <Input
          placeholder="Consumer name"
          className="w-[180px]"
          value={consumerName}
          onChange={(e) => setConsumerName(e.target.value)}
        />

        {/* Rating filter */}
        <Select
          value={minRating || "ALL"}
          onValueChange={(v) => setMinRating(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Min rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All ratings</SelectItem>
            <SelectItem value="1">1+ star</SelectItem>
            <SelectItem value="2">2+ stars</SelectItem>
            <SelectItem value="3">3+ stars</SelectItem>
            <SelectItem value="4">4+ stars</SelectItem>
            <SelectItem value="5">5 stars</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range filter */}
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
      </FilterBar>

      {/* Error state */}
      {isError ? (
        <div className="card bg-base-100 shadow-sm flex flex-col items-center gap-4 p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Unable to load reviews
            </p>
            <p className="text-xs opacity-60">
              Something went wrong while fetching reviews. Please try again.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <DataTableWrapper
          isLoading={isLoading}
          isEmpty={!isLoading && reviews.length === 0}
          isError={false}
          columns={5}
          emptyMessage="No reviews match the current filters"
          onRetry={() => refetch()}
        >
          <ReviewsTable reviews={reviews} isLoading={false} />

          {totalCount > 0 && (
            <PaginationFooter
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={totalCount}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              itemLabel="reviews"
            />
          )}
        </DataTableWrapper>
      )}
    </PageStack>
  );
}
