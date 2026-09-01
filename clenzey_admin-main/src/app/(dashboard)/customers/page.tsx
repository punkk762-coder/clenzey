"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { customersApi } from "@/lib/api/customers";
import { usePagination } from "@/hooks/usePagination";
import { dateShort, inr, initials } from "@/lib/utils/format";

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const pagination = usePagination({
    totalCount,
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  useEffect(() => {
    pagination.resetToFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const { data: customers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["customers", query.trim(), pagination.page, pagination.pageSize],
    queryFn: () =>
      customersApi.list({
        ...(query.trim() && { query: query.trim() }),
        limit: pagination.limit,
        offset: pagination.offset,
      }),
  });

  useEffect(() => {
    const pageCount = customers.length;
    if (pageCount < pagination.pageSize) {
      setTotalCount(pagination.offset + pageCount);
      return;
    }
    setTotalCount(pagination.offset + pageCount + pagination.pageSize);
  }, [customers.length, pagination.offset, pagination.pageSize]);

  return (
    <PageStack>
      <PageHeader
        eyebrow="Network · Customers"
        title="Customers"
        description="Registered consumers with booking count and lifetime spend from the admin API."
      />

      <FilterBar>
        <Input
          placeholder="Search name, phone, or referral code…"
          className="max-w-md flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </FilterBar>

      <DataTableWrapper
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && customers.length === 0}
        columns={6}
        emptyMessage="No customers match the current search"
        onRetry={() => refetch()}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                Customer
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                Phone
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                Referral code
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-xs font-medium opacity-60">
                Bookings
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                Total spend
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow
                key={customer.id}
                className="cursor-pointer hover:bg-base-200 transition-colors duration-150"
              >
                <TableCell className="px-6 py-4">
                  <Link href={`/customers/${customer.id}`} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-content text-xs font-bold">
                        {initials(customer.fullName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {customer.fullName ?? "Unnamed"}
                      </div>
                      <div className="text-[11px] opacity-60">
                        Joined {dateShort(customer.createdAt)}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="px-6 py-4 font-mono text-sm">
                  <Link href={`/customers/${customer.id}`} className="block">
                    {customer.phone ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="px-6 py-4 font-mono text-xs">
                  <Link href={`/customers/${customer.id}`} className="block">
                    {customer.referralCode}
                  </Link>
                </TableCell>
                <TableCell className="px-6 py-4 text-center text-sm">
                  <Link href={`/customers/${customer.id}`} className="block">
                    {customer.totalBookings ?? 0}
                  </Link>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm font-medium">
                  <Link href={`/customers/${customer.id}`} className="block">
                    {inr(parseFloat(customer.totalSpend ?? "0") || 0)}
                  </Link>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Link href={`/customers/${customer.id}`} className="block">
                    <Badge variant={customer.isActive ? "success" : "muted"}>
                      {customer.isActive ? "Active" : "Blocked"}
                    </Badge>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalCount > 0 && (
          <PaginationFooter
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={totalCount}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            itemLabel="customers"
          />
        )}
      </DataTableWrapper>
    </PageStack>
  );
}
