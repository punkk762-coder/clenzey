"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Plus } from "lucide-react";
import { toast } from "@/lib/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/RoleGate";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { API_MAX_PAGE_SIZE } from "@/lib/api/params";
import { mapPayoutStatus, paymentsApi } from "@/lib/api/payments";
import { partnersApi } from "@/lib/api/partners";
import { getApiErrorMessage } from "@/lib/api/errors";
import { inr } from "@/lib/utils/format";
import type { BackendPayoutStatus, PartnerPayout, PayoutStatus } from "@/types";

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const PAYOUT_STATUSES: BackendPayoutStatus[] = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
];

const STATUS_FILTER_LABEL: Record<BackendPayoutStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
};

function normalizeStatus(status: PartnerPayout["status"]): PayoutStatus {
  if (
    status === "PAID" ||
    status === "FAILED" ||
    status === "PROCESSING"
  ) {
    return mapPayoutStatus(status as BackendPayoutStatus);
  }
  return status as PayoutStatus;
}

function getStatusVariant(
  status: PayoutStatus,
): "success" | "warning" | "muted" | "signal" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PENDING":
    case "PROCESSING":
      return "warning";
    case "ON_HOLD":
      return "muted";
    default:
      return "signal";
  }
}

function getStatusLabel(status: PayoutStatus): string {
  switch (status) {
    case "COMPLETED":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "ON_HOLD":
      return "Failed";
    default:
      return status;
  }
}

function payoutAmount(payout: PartnerPayout): number {
  return payout.amount ?? payout.commissionAmount ?? 0;
}

function backendStatus(payout: PartnerPayout): BackendPayoutStatus {
  const status = payout.status;
  if (status === "COMPLETED") return "PAID";
  if (status === "ON_HOLD") return "FAILED";
  return status as BackendPayoutStatus;
}

export function PayoutTable() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPayout, setDetailPayout] = useState<PartnerPayout | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | BackendPayoutStatus>("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState({
    partnerId: "",
    amount: "",
    notes: "",
  });

  const filterParams = useMemo(() => {
    const params: { status?: BackendPayoutStatus; partnerId?: string } = {};
    if (statusFilter) params.status = statusFilter;
    if (partnerFilter) params.partnerId = partnerFilter;
    return params;
  }, [statusFilter, partnerFilter]);

  const pagination = usePagination({
    totalCount,
    pageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  useEffect(() => {
    pagination.resetToFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, partnerFilter]);

  const {
    data: partners = [],
    isLoading: partnersLoading,
    isError: partnersError,
    refetch: refetchPartners,
  } = useQuery({
    queryKey: ["partners", "approved"],
    queryFn: () =>
      partnersApi.list({
        approvalStatus: "APPROVED",
        limit: API_MAX_PAGE_SIZE,
      }),
  });

  const {
    data: availableBalance = null,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useQuery({
    queryKey: ["payments", "available-balance", form.partnerId],
    queryFn: () => paymentsApi.getPartnerAvailableBalance(form.partnerId),
    enabled: createOpen && !!form.partnerId,
  });

  const requestedAmount = Number.parseFloat(form.amount);
  const hasValidAmount =
    Number.isFinite(requestedAmount) && requestedAmount > 0;
  const exceedsBalance =
    availableBalance != null &&
    hasValidAmount &&
    requestedAmount > availableBalance + 0.001;
  const hasNoBalance = availableBalance != null && availableBalance <= 0;

  const {
    data: payoutsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payments", "payouts", filterParams, pagination.page, pagination.pageSize],
    queryFn: () =>
      paymentsApi.payouts({
        ...filterParams,
        limit: pagination.limit,
        offset: pagination.offset,
      }),
  });

  const { data: pendingPayoutsData } = useQuery({
    queryKey: ["payments", "payouts", "pending"],
    queryFn: () =>
      paymentsApi.payouts(
        { status: "PENDING", limit: API_MAX_PAGE_SIZE },
        { enrich: false },
      ),
  });

  useEffect(() => {
    if (payoutsData) {
      setTotalCount(payoutsData.total);
    }
  }, [payoutsData]);

  const payouts = Array.isArray(payoutsData?.data) ? payoutsData.data : [];
  const pendingPayouts = pendingPayoutsData?.data ?? [];
  const pendingTotal = pendingPayouts.reduce(
    (sum, payout) => sum + payoutAmount(payout),
    0,
  );

  const processBatch = useMutation({
    mutationFn: (ids: string[]) => paymentsApi.processBatch(ids),
    onSuccess: (result) => {
      toast.success(
        `Processed ${result.successCount} payout${result.successCount === 1 ? "" : "s"}${result.failedCount > 0 ? ` (${result.failedCount} failed)` : ""}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setConfirmOpen(false);
    },
    onError: (error: unknown, variables) => {
      const err = error as {
        response?: { data?: { successCount?: number; failedCount?: number } };
      };
      const successCount = err?.response?.data?.successCount ?? 0;
      const failedCount =
        err?.response?.data?.failedCount ?? variables.length;
      toast.error(
        getApiErrorMessage(
          error,
          `Batch processing: ${successCount} succeeded, ${failedCount} failed.`,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setConfirmOpen(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      paymentsApi.initiatePayout({
        partnerId: form.partnerId,
        amount: parseFloat(form.amount),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
      }),
    onSuccess: () => {
      toast.success("Payout initiated");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setCreateOpen(false);
      setForm({ partnerId: "", amount: "", notes: "" });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to initiate payout")),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: BackendPayoutStatus;
    }) => paymentsApi.updatePayoutStatus(id, status),
    onSuccess: (payout) => {
      toast.success("Payout status updated");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setDetailPayout(payout);
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to update payout status")),
  });

  const handleProcessAll = () => {
    if (pendingPayouts.length === 0) {
      toast.info("No pending payouts to process.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmProcess = () => {
    processBatch.mutate(pendingPayouts.map((payout) => payout.id));
  };

  const handleCreate = () => {
    if (!form.partnerId || !hasValidAmount) {
      toast.error("Partner and a valid amount are required");
      return;
    }
    if (availableBalance != null && requestedAmount > availableBalance + 0.001) {
      toast.error(
        availableBalance <= 0
          ? "This partner has no earnings available to pay out."
          : `Amount exceeds available balance (${inr(availableBalance)}).`,
      );
      return;
    }
    createMutation.mutate();
  };

  const detailStatus = detailPayout ? backendStatus(detailPayout) : null;

  return (
    <div className="card admin-table-card">
      <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold">Partner Payout Reports</h3>
          <p className="text-xs opacity-60">
            List, initiate, and update partner payouts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleGate allow="finance">
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Initiate payout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleProcessAll}
              disabled={pendingPayouts.length === 0}
            >
              Process all
            </Button>
          </RoleGate>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <FilterBar resultCount={totalCount} resultLabel="payout">
          <Select
            value={statusFilter === "" ? "ALL" : statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value === "ALL" ? "" : (value as BackendPayoutStatus))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {PAYOUT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_FILTER_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={partnerFilter === "" ? "ALL" : partnerFilter}
            onValueChange={(value) =>
              setPartnerFilter(value === "ALL" ? "" : value)
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All partners</SelectItem>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.fullName ?? partner.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        <DataTableWrapper
          isLoading={isLoading}
          isError={isError}
          isEmpty={!isLoading && !isError && payouts.length === 0}
          columns={5}
          emptyMessage="No payout records found"
          onRetry={() => refetch()}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-b border-base-300">
                <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                  Partner Name
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                  Amount
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                  Created
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium opacity-60">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => {
                const displayStatus = normalizeStatus(payout.status);
                return (
                  <TableRow
                    key={payout.id}
                    className="border-b border-base-200 transition-colors duration-150 hover:bg-base-200"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium">
                      {payout.partnerName || "Unknown partner"}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-mono text-sm">
                      {inr(payoutAmount(payout))}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant={getStatusVariant(displayStatus)}>
                        {getStatusLabel(displayStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-mono text-xs opacity-80">
                      {payout.createdAt
                        ? new Date(payout.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDetailPayout(payout)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
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
              itemLabel="payouts"
            />
          )}
        </DataTableWrapper>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate payout</DialogTitle>
            <DialogDescription>
              Create a pending payout for an approved partner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="payout-partner">Partner</Label>
              {partnersLoading ? (
                <p className="text-sm opacity-60">Loading partners…</p>
              ) : partnersError ? (
                <div className="space-y-2">
                  <p className="text-sm text-error">Failed to load partners.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchPartners()}
                  >
                    Retry
                  </Button>
                </div>
              ) : partners.length === 0 ? (
                <p className="text-sm opacity-60">
                  No approved partners available.
                </p>
              ) : (
                <Select
                  value={form.partnerId || undefined}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, partnerId: value }))
                  }
                >
                  <SelectTrigger id="payout-partner">
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent disablePortal>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.fullName ?? partner.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Amount (INR)</Label>
              {form.partnerId && (
                <p className="text-xs opacity-70">
                  {balanceLoading
                    ? "Loading available balance…"
                    : balanceError
                      ? "Could not load available balance."
                      : `Available to pay out: ${inr(availableBalance ?? 0)}`}
                </p>
              )}
              <Input
                id="payout-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={
                  availableBalance != null && availableBalance > 0
                    ? availableBalance
                    : undefined
                }
                value={form.amount}
                onChange={(e) =>
                  setForm((current) => ({ ...current, amount: e.target.value }))
                }
                aria-invalid={exceedsBalance}
                className={exceedsBalance ? "input-error" : undefined}
              />
              {hasNoBalance && !balanceLoading && !balanceError && (
                <p className="text-xs text-warning">
                  This partner has no unpaid earnings. Record salary or
                  incentives first, or wait until existing payouts settle.
                </p>
              )}
              {exceedsBalance && (
                <p className="text-xs text-error">
                  Amount exceeds available balance ({inr(availableBalance ?? 0)}).
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-notes">Notes (optional)</Label>
              <Input
                id="payout-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({ ...current, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                partnersLoading ||
                partnersError ||
                partners.length === 0 ||
                !form.partnerId ||
                !hasValidAmount ||
                balanceLoading ||
                balanceError ||
                hasNoBalance ||
                exceedsBalance
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Processing</DialogTitle>
            <DialogDescription>
              Mark {pendingPayouts.length} pending payout
              {pendingPayouts.length === 1 ? "" : "s"} as processing, totalling{" "}
              {inr(pendingTotal)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={processBatch.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmProcess}
              disabled={processBatch.isPending}
            >
              {processBatch.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm processing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailPayout !== null}
        onOpenChange={(open) => {
          if (!open) setDetailPayout(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              {detailPayout?.partnerName || "Unknown partner"}
            </DialogDescription>
          </DialogHeader>
          {detailPayout && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Amount
                </p>
                <p className="font-medium">{inr(payoutAmount(detailPayout))}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Status
                </p>
                <Badge
                  variant={getStatusVariant(normalizeStatus(detailPayout.status))}
                >
                  {getStatusLabel(normalizeStatus(detailPayout.status))}
                </Badge>
              </div>
              {detailPayout.notes && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                    Notes
                  </p>
                  <p>{detailPayout.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col items-stretch gap-2">
            {detailPayout &&
              detailStatus &&
              detailStatus !== "PAID" &&
              detailStatus !== "FAILED" && (
                <RoleGate allow="finance">
                  <div className="grid grid-cols-2 gap-2">
                  {detailStatus === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={updateStatus.isPending}
                      onClick={() =>
                        updateStatus.mutate({
                          id: detailPayout.id,
                          status: "PROCESSING",
                        })
                      }
                    >
                      Start processing
                    </Button>
                  )}
                  {(detailStatus === "PENDING" ||
                    detailStatus === "PROCESSING") && (
                    <>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({
                            id: detailPayout.id,
                            status: "PAID",
                          })
                        }
                      >
                        Complete payout
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className={
                          detailStatus === "PENDING"
                            ? "col-span-2 w-full"
                            : "w-full"
                        }
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({
                            id: detailPayout.id,
                            status: "FAILED",
                          })
                        }
                      >
                        Fail payout
                      </Button>
                    </>
                  )}
                  </div>
                </RoleGate>
              )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setDetailPayout(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
