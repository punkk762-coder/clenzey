"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { disputesApi } from "@/lib/api/disputes";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { dateShort } from "@/lib/utils/format";
import type { Dispute, DisputeStatus } from "@/types";

const DISPUTE_STATUSES: DisputeStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
];

const STATUS_DOT: Record<DisputeStatus, string> = {
  OPEN: "bg-warning",
  UNDER_REVIEW: "bg-primary",
  RESOLVED: "bg-success",
  CLOSED: "bg-base-content/30",
};

const STATUS_LABEL: Record<DisputeStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const CATEGORY_LABEL: Record<string, string> = {
  SERVICE_QUALITY: "Service quality",
  PRICING: "Pricing",
  BILLING: "Pricing",
  NO_SHOW: "No show",
  DAMAGE: "Damage",
  OTHER: "Other",
};

const RESOLUTION_MAX_LENGTH = 1000;

const TABLE_HEAD_CLASS =
  "px-4 py-3.5 text-[11px] font-semibold normal-case tracking-wide text-base-content/65 sm:px-5";

function getResolutionNotes(dispute: Dispute): string {
  return dispute.resolutionNotes ?? dispute.resolution ?? "";
}

function CategoryTag({ label }: { label: string }) {
  return (
    <Badge variant="outline" size="xs" className="whitespace-nowrap">
      {label}
    </Badge>
  );
}

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: DisputeStatus;
  disabled?: boolean;
  onChange: (status: DisputeStatus) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DisputeStatus)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "!h-8 !min-h-8 !w-auto !rounded-full !border !border-base-300 !bg-base-100 !px-3 !py-0 !text-sm !font-medium !shadow-none",
          "!input-ghost hover:!bg-base-200 focus:!ring-2 focus:!ring-primary/20",
        )}
        aria-label={`Change status from ${STATUS_LABEL[value]}`}
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[value])}
              aria-hidden
            />
            <span className="normal-case">{STATUS_LABEL[value]}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[10rem]">
        {DISPUTE_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            <span className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])}
                aria-hidden
              />
              <span className="normal-case">{STATUS_LABEL[status]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface DisputesTableProps {
  disputes: Dispute[];
  onUpdate?: () => void;
}

export function DisputesTable({ disputes, onUpdate }: DisputesTableProps) {
  const queryClient = useQueryClient();
  const [editingResolution, setEditingResolution] = useState<string | null>(null);
  const [resolutionDraft, setResolutionDraft] = useState<string>("");

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { status: DisputeStatus; resolutionNotes?: string };
    }) => disputesApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["disputes"] });

      const previousQueries = queryClient.getQueriesData<{
        data: Dispute[];
        total: number;
      }>({ queryKey: ["disputes"] });

      queryClient.setQueriesData<{ data: Dispute[]; total: number }>(
        { queryKey: ["disputes"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((d) =>
              d.id === id
                ? {
                    ...d,
                    ...(patch.status ? { status: patch.status } : {}),
                    ...(patch.resolutionNotes !== undefined
                      ? { resolutionNotes: patch.resolutionNotes }
                      : {}),
                    updatedAt: new Date().toISOString(),
                  }
                : d,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (error, _variables, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(
        getApiErrorMessage(error, "Failed to update dispute. Changes reverted."),
      );
    },
    onSuccess: (_data, variables) => {
      if (variables.patch.status && variables.patch.resolutionNotes === undefined) {
        toast.success("Dispute status updated");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      onUpdate?.();
    },
  });

  const handleStatusChange = (disputeId: string, newStatus: DisputeStatus) => {
    updateMutation.mutate({ id: disputeId, patch: { status: newStatus } });
  };

  const handleResolutionEdit = (dispute: Dispute) => {
    if (dispute.status === "CLOSED") return;
    setEditingResolution(dispute.id);
    setResolutionDraft(getResolutionNotes(dispute));
  };

  const handleResolutionSave = (dispute: Dispute) => {
    const trimmed = resolutionDraft.trim();
    updateMutation.mutate(
      {
        id: dispute.id,
        patch: { status: dispute.status, resolutionNotes: trimmed },
      },
      {
        onSuccess: () => {
          toast.success("Resolution note saved");
          setEditingResolution(null);
          setResolutionDraft("");
        },
      },
    );
  };

  const handleResolutionCancel = () => {
    setEditingResolution(null);
    setResolutionDraft("");
  };

  if (disputes.length === 0) {
    return null;
  }

  return (
    <Table className="table-pin-rows">
      <TableHeader>
        <TableRow className="border-b border-base-300 bg-base-200/40 hover:bg-base-200/40">
          <TableHead className={cn(TABLE_HEAD_CLASS, "min-w-[11rem]")}>Dispute</TableHead>
          <TableHead className={cn(TABLE_HEAD_CLASS, "hidden lg:table-cell")}>Booking</TableHead>
          <TableHead className={TABLE_HEAD_CLASS}>Category</TableHead>
          <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
          <TableHead className={cn(TABLE_HEAD_CLASS, "hidden md:table-cell")}>Parties</TableHead>
          <TableHead className={cn(TABLE_HEAD_CLASS, "hidden sm:table-cell")}>Created</TableHead>
          <TableHead className={cn(TABLE_HEAD_CLASS, "min-w-[14rem]")}>Resolution</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {disputes.map((dispute) => {
          const isEditingThis = editingResolution === dispute.id;
          const isMutating =
            updateMutation.isPending &&
            updateMutation.variables?.id === dispute.id;
          const notes = getResolutionNotes(dispute);
          const shortId = dispute.id.slice(0, 8).toUpperCase();

          return (
            <TableRow
              key={dispute.id}
              className="transition-colors duration-150 hover:bg-base-200/60"
            >
              <TableCell className="align-top px-4 py-3 sm:px-5">
                <div className="space-y-1">
                  <p className="font-mono text-sm font-medium tracking-tight">
                    <Link
                      href={`/disputes/${dispute.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {shortId}
                    </Link>
                  </p>
                  {dispute.description ? (
                    <p className="line-clamp-2 text-sm leading-relaxed text-base-content/70">
                      {dispute.description}
                    </p>
                  ) : null}
                  <p className="font-mono text-xs text-base-content/45 lg:hidden">
                    {dispute.bookingReference}
                  </p>
                </div>
              </TableCell>

              <TableCell className="hidden px-4 py-3 sm:px-5 lg:table-cell">
                <Link
                  href={`/bookings/${dispute.bookingId}`}
                  className="font-mono text-sm font-medium text-base-content/80 underline-offset-2 transition-colors hover:text-primary hover:underline"
                >
                  {dispute.bookingReference}
                </Link>
              </TableCell>

              <TableCell className="px-4 py-3 sm:px-5">
                <CategoryTag
                  label={CATEGORY_LABEL[dispute.category] ?? dispute.category}
                />
              </TableCell>

              <TableCell className="px-4 py-3 sm:px-5">
                <StatusSelect
                  value={dispute.status}
                  disabled={isMutating}
                  onChange={(next) => handleStatusChange(dispute.id, next)}
                />
              </TableCell>

              <TableCell className="hidden px-4 py-3 sm:px-5 md:table-cell">
                <div className="space-y-1 text-sm">
                  <p className="font-medium leading-snug">{dispute.consumerName}</p>
                  <p className="text-base-content/65">{dispute.partnerName}</p>
                </div>
              </TableCell>

              <TableCell className="hidden px-4 py-3 sm:px-5 sm:table-cell">
                <time
                  dateTime={dispute.createdAt}
                  className="text-sm text-base-content/70"
                >
                  {dateShort(dispute.createdAt)}
                </time>
              </TableCell>

              <TableCell className="align-top px-4 py-3 sm:px-5">
                {isEditingThis ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={resolutionDraft}
                      onChange={(e) => {
                        if (e.target.value.length <= RESOLUTION_MAX_LENGTH) {
                          setResolutionDraft(e.target.value);
                        }
                      }}
                      maxLength={RESOLUTION_MAX_LENGTH}
                      placeholder="Describe the resolution outcome…"
                      rows={3}
                      disabled={isMutating}
                      aria-label="Resolution note"
                      className="min-h-[72px] text-sm leading-relaxed"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-base-content/50">
                        {resolutionDraft.length}/{RESOLUTION_MAX_LENGTH}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResolutionCancel}
                          disabled={isMutating}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolutionSave(dispute)}
                          disabled={isMutating}
                        >
                          {isMutating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start gap-2">
                    <button
                      type="button"
                      className={cn(
                        "min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm leading-relaxed transition-colors",
                        notes
                          ? "text-base-content/80"
                          : "italic text-base-content/45",
                        dispute.status !== "CLOSED" &&
                          "hover:border-base-300 hover:bg-base-200/80",
                        dispute.status === "CLOSED" && "cursor-default",
                      )}
                      onClick={() => handleResolutionEdit(dispute)}
                      disabled={dispute.status === "CLOSED"}
                      aria-label={`Edit resolution for dispute ${shortId}`}
                    >
                      {notes ? (
                        <span className="line-clamp-3">{notes}</span>
                      ) : (
                        "Add resolution note…"
                      )}
                    </button>
                    {dispute.status !== "CLOSED" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => handleResolutionEdit(dispute)}
                        aria-label={`Edit resolution for dispute ${shortId}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-2 space-y-0.5 text-sm md:hidden">
                  <p className="font-medium">{dispute.consumerName}</p>
                  <p className="text-base-content/65">{dispute.partnerName}</p>
                  <time
                    dateTime={dispute.createdAt}
                    className="text-xs text-base-content/50"
                  >
                    {dateShort(dispute.createdAt)}
                  </time>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
