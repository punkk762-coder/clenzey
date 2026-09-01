"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { RoleGate } from "@/components/auth/RoleGate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { customersApi } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api/errors";
import { dateShort, dateTime, inr, initials } from "@/lib/utils/format";

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "success",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
  NO_SHOW: "destructive",
  PENDING: "secondary",
  PAYMENT_PENDING: "secondary",
  CONFIRMED: "default",
  PROFESSIONAL_ASSIGNED: "default",
  PROFESSIONAL_EN_ROUTE: "default",
  CHECKED_IN: "default",
  IN_PROGRESS: "default",
};

function formatAddressLine(address: {
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
}): string {
  return [address.line1, address.line2, address.landmark, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const {
    data: customer,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customersApi.get(id),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["customer-bookings", id],
    queryFn: () => customersApi.getBookings(id),
    enabled: !!customer,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ["customer-addresses", id],
    queryFn: () => customersApi.getAddresses(id),
    enabled: !!customer,
  });

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => customersApi.setActive(id, isActive),
    onSuccess: (_data, isActive) => {
      toast.success(isActive ? "Customer reactivated" : "Customer blocked");
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to update customer status")),
  });

  if (isLoading) {
    return (
      <PageStack density="compact">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg lg:col-span-1" />
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
      </PageStack>
    );
  }

  if (isError || !customer) {
    return (
      <PageStack density="compact">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" /> Back to directory
          </Link>
        </Button>
        <ErrorState
          message={getApiErrorMessage(error, "Could not load customer profile.")}
          onRetry={() => refetch()}
        />
      </PageStack>
    );
  }

  return (
    <PageStack density="compact">
      <section className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" /> Back to directory
          </Link>
        </Button>

        <PageHeader
          eyebrow="Customer profile"
          title={customer.fullName ?? "Unnamed customer"}
          description={`Member since ${dateShort(customer.createdAt)} · Referral ${customer.referralCode}`}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={customer.isActive ? "success" : "destructive"} size="sm">
                {customer.isActive ? "Active" : "Blocked"}
              </Badge>
              <RoleGate allow="operate">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggleActive.isPending}
                  onClick={() => toggleActive.mutate(!customer.isActive)}
                >
                  {customer.isActive ? "Block customer" : "Reactivate customer"}
                </Button>
              </RoleGate>
            </div>
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-20 w-20 ring-2 ring-primary/40">
              <AvatarFallback className="text-lg">
                {initials(customer.fullName ?? "??")}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-3 text-xl font-semibold">
              {customer.fullName ?? "Unnamed"}
            </CardTitle>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              {customer.phone ?? customer.id.slice(0, 8)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex justify-between text-sm">
              <span className="opacity-60">Total bookings</span>
              <span className="font-semibold">{customer.totalBookings ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-60">Lifetime spend</span>
              <span className="font-semibold">
                {inr(customer.totalSpend ?? "0")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Saved addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {addressesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-box" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-sm opacity-60">No saved addresses on file.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-box border border-base-300 bg-base-200/40 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{address.label}</span>
                      {address.isDefault && (
                        <Badge variant="muted" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                      <Badge
                        variant={address.isServiceable ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {address.isServiceable ? "Serviceable" : "Out of zone"}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-70">{formatAddressLine(address)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Booking history</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-box" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-sm opacity-60">No bookings recorded for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide opacity-60">
                      <th className="pb-2 text-left font-medium">Booking #</th>
                      <th className="pb-2 text-left font-medium">Service</th>
                      <th className="pb-2 text-left font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                      <th className="pb-2 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/bookings/${b.id}`}
                            className="link link-primary font-mono text-xs no-underline hover:underline"
                          >
                            {b.bookingNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div>{b.serviceName}</div>
                          <div className="text-xs opacity-60">{b.variantLabel}</div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge
                            variant={
                              (STATUS_COLOR[b.status] as
                                | "success"
                                | "destructive"
                                | "secondary"
                                | "default") ?? "secondary"
                            }
                            className="text-[10px]"
                          >
                            {b.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-medium">
                          {inr(b.totalAmount)}
                        </td>
                        <td className="py-2.5 text-right text-xs opacity-60">
                          {dateTime(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageStack>
  );
}
