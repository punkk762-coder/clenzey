"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { toast } from "@/lib/toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingsApi } from "@/lib/api/bookings";
import { paymentsApi } from "@/lib/api/payments";
import { getApiErrorMessage } from "@/lib/api/errors";
import { API_MAX_PAGE_SIZE } from "@/lib/api/params";
import { inr, dateShort } from "@/lib/utils/format";
import type { Refund, RefundStatus } from "@/types";

const STATUS_VARIANT: Record<
  RefundStatus,
  "warning" | "signal" | "success" | "destructive"
> = {
  INITIATED: "warning",
  PROCESSING: "signal",
  COMPLETED: "success",
  FAILED: "destructive",
};

const STATUS_LABEL: Record<RefundStatus, string> = {
  INITIATED: "Initiated",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function RefundTracker() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    bookingId: "",
    amount: "",
    reason: "",
  });

  const {
    data: refundsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payments", "refunds"],
    queryFn: () => paymentsApi.refunds({ limit: 50 }),
  });

  const refunds = Array.isArray(refundsData?.data) ? refundsData.data : [];

  const {
    data: bookingsResponse,
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["bookings", "refund-select"],
    queryFn: () => bookingsApi.list({ limit: API_MAX_PAGE_SIZE }),
    enabled: createOpen,
    staleTime: 60 * 1000,
  });

  const bookingOptions = React.useMemo(() => {
    return (bookingsResponse?.bookings ?? [])
      .map((booking) => ({
        id: booking.id,
        label: `${booking.bookingNumber} · ${booking.consumerName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [bookingsResponse?.bookings]);

  const createMutation = useMutation({
    mutationFn: () =>
      paymentsApi.initiateRefund({
        bookingId: form.bookingId.trim(),
        amount: parseFloat(form.amount),
        ...(form.reason.trim() && { reason: form.reason.trim() }),
      }),
    onSuccess: () => {
      toast.success("Refund initiated");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setCreateOpen(false);
      setForm({ bookingId: "", amount: "", reason: "" });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to initiate refund")),
  });

  const handleCreate = () => {
    if (!form.bookingId.trim() || !form.amount || Number(form.amount) <= 0) {
      toast.error("Booking and a valid amount are required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="card admin-table-card">
      <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold">Refund Transactions</h3>
          <p className="text-xs opacity-60">
            View refund status and initiate new refunds
          </p>
        </div>
        <RoleGate allow="finance">
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Initiate refund
          </Button>
        </RoleGate>
      </div>

      <div className="px-5 py-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load refunds</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && refunds.length === 0 && (
          <p className="py-8 text-center text-sm opacity-60">
            No refund transactions yet
          </p>
        )}

        {!isLoading && !isError && refunds.length > 0 && (
          <ul className="divide-y divide-base-200">
            {refunds.map((refund: Refund) => (
              <li
                key={refund.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    Booking {refund.bookingReference ?? refund.bookingId.slice(0, 8)}
                  </p>
                  <p className="text-xs opacity-60">
                    {inr(refund.refundAmount ?? refund.amount ?? 0)}
                    {refund.reason ? ` · ${refund.reason}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={STATUS_VARIANT[refund.status]}>
                    {STATUS_LABEL[refund.status]}
                  </Badge>
                  <span className="font-mono text-[10px] opacity-60">
                    {dateShort(refund.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate refund</DialogTitle>
            <DialogDescription>
              Create a refund request for a booking via the admin API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking</Label>
              {bookingsLoading ? (
                <p className="text-sm opacity-60">Loading bookings…</p>
              ) : bookingsError ? (
                <div className="space-y-2">
                  <p className="text-sm text-error">Failed to load bookings.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetchBookings()}
                  >
                    Retry
                  </Button>
                </div>
              ) : bookingOptions.length === 0 ? (
                <p className="text-sm opacity-60">No bookings available.</p>
              ) : (
                <Select
                  value={form.bookingId || undefined}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, bookingId: value }))
                  }
                >
                  <SelectTrigger id="bookingId">
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent disablePortal>
                    {bookingOptions.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (INR)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending || bookingsLoading || !form.bookingId
              }
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
