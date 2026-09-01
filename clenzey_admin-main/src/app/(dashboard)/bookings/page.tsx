"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { BookingStatsCards } from "@/components/bookings/BookingStatsCards";
import { bookingsApi } from "@/lib/api/bookings";
import { servicesApi } from "@/lib/api/services";
import { useExportFile } from "@/hooks/useExportFile";
import { usePagination } from "@/hooks/usePagination";
import { dateTime, inr } from "@/lib/utils/format";
import type { BookingStatus } from "@/types";

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUSES: BookingStatus[] = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "NO_SHOW",
];

export default function BookingsListPage() {
  // Filter state
  const [status, setStatus] = useState<"" | BookingStatus>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Fetch services list for the service filter dropdown
  const {
    data: services = [],
    isError: servicesError,
  } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Build API filter params (without pagination)
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (serviceId) params.serviceId = serviceId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [status, serviceId, startDate, endDate]);

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
  }, [status, serviceId, startDate, endDate]);

  // Fetch bookings with pagination
  const { data: bookingsResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["bookings", filterParams, pagination.page, pagination.pageSize],
    queryFn: () =>
      bookingsApi.list({
        ...filterParams,
        limit: pagination.limit,
        offset: pagination.offset,
      }),
  });

  // Update totalCount when data arrives
  useEffect(() => {
    if (bookingsResponse) {
      setTotalCount(bookingsResponse.total);
    }
  }, [bookingsResponse]);

  const bookings = bookingsResponse?.bookings ?? [];

  // CSV export
  const today = new Date().toISOString().slice(0, 10);
  const exportFilename = `bookings_export_${today}.csv`;

  const exportFilterParams = useMemo(
    () => ({
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(serviceId && { serviceType: serviceId }),
    }),
    [status, serviceId, startDate, endDate],
  );

  const { trigger: triggerExport, isExporting } = useExportFile({
    fetchFn: () => bookingsApi.exportCsv(exportFilterParams),
    filename: exportFilename,
    timeoutMs: 30000,
  });

  // Client-side text search on the current page of bookings
  const filtered = useMemo(() => {
    if (!query.trim()) return bookings;
    const q = query.toLowerCase();
    return bookings.filter(
      (b) =>
        b.bookingNumber.toLowerCase().includes(q) ||
        b.consumerName.toLowerCase().includes(q) ||
        b.consumerPhone.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q),
    );
  }, [bookings, query]);

  return (
    <PageStack>
      <BookingStatsCards />

      <PageHeader
        eyebrow="Operations · Bookings"
        title="The log"
        description="Every booking flowing through the network. Filter by lifecycle stage, search by booking ID, customer, or phone."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={triggerExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      {/* Filter bar */}
      <FilterBar resultCount={filtered.length} resultLabel="result">
        {/* Status filter */}
        <Select
          value={status === "" ? "ALL" : status}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : (v as BookingStatus))}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Service type filter */}
        <Select
          value={serviceId === "" ? "ALL_SERVICES" : serviceId}
          onValueChange={(v) => setServiceId(v === "ALL_SERVICES" ? "" : v)}
          disabled={servicesError}
        >
          <SelectTrigger className="w-[200px]" title={servicesError ? "Failed to load services" : undefined}>
            <SelectValue placeholder="Service type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_SERVICES">All Services</SelectItem>
            {services.map((svc) => (
              <SelectItem key={svc.id} value={svc.id}>
                {svc.name}
              </SelectItem>
            ))}
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

        {/* Text search */}
        <Input
          placeholder="Search booking #, customer, phone, service…"
          className="max-w-md flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </FilterBar>

      {/* Bookings table */}
      <DataTableWrapper
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && filtered.length === 0}
        columns={7}
        emptyMessage="No bookings match the current filter"
        onRetry={() => refetch()}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">
                Booking
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">
                Customer
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">
                Service
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">
                Scheduled
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">
                Status
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300 text-right">
                Total
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                  <div className="font-mono text-xs">{b.bookingNumber}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                    {b.bookingType}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                  <div className="text-sm">{b.consumerName}</div>
                  <div className="font-mono text-[10px] opacity-60">
                    {b.consumerPhone}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                  <div className="text-sm">{b.serviceName}</div>
                  <div className="font-mono text-[10px] opacity-60">
                    {b.variantLabel}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                  <div className="font-mono text-xs opacity-80">
                    {dateTime(b.scheduledAt ?? b.createdAt)}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200 text-right">
                  <span className="num font-mono text-sm">
                    {inr(b.totalAmount)}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm border-b border-base-200 text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/bookings/${b.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {totalCount > 0 && (
          <PaginationFooter
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={totalCount}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            itemLabel="bookings"
          />
        )}
      </DataTableWrapper>
    </PageStack>
  );
}
