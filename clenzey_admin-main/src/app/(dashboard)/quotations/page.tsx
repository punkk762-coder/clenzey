"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Calendar, Check, Clock, FileText,
  Loader2, MapPin, Phone, X, IndianRupee, StickyNote,
} from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuotationEvents } from "@/hooks/useQuotationEvents";
import { quotationsApi } from "@/lib/api/quotations";
import { getApiErrorMessage, isApiNotFound } from "@/lib/api/errors";
import { dateTime, inr, timeAgo } from "@/lib/utils/format";
import type { Quotation } from "@/types";

// ─── Status config ────────────────────────────────────────────────
const STATUS_BADGE: Record<
  Quotation["status"],
  "warning" | "default" | "success" | "destructive" | "muted" | "signal"
> = {
  PENDING: "warning",
  SCHEDULED: "default",
  QUOTED: "signal",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "muted",
};

const STATUS_LABEL: Record<Quotation["status"], string> = {
  PENDING: "Pending review",
  SCHEDULED: "Site visit scheduled",
  QUOTED: "Quote sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

// ─── Quote amount dialog ──────────────────────────────────────────
function QuoteDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  loading: boolean;
}) {
  const [amount, setAmount] = useState("");
  const valid = parseFloat(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send quotation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm opacity-60">
            Enter the quoted amount. The customer will see this when they check their site visit status.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="quote-amount">Quoted amount (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input
                id="quote-amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button disabled={!valid || loading} onClick={() => onConfirm(parseFloat(amount))}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail sheet ─────────────────────────────────────────────────
function QuotationSheet({
  q,
  open,
  onClose,
  onAction,
  mutatingId,
}: {
  q: Quotation | null;
  open: boolean;
  onClose: () => void;
  onAction: (id: string, status: Quotation["status"], quotedAmount?: number) => void;
  mutatingId: string | null;
}) {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  if (!q) return null;

  const loading = mutatingId === q.id;

  const actions: React.ReactNode = (() => {
    switch (q.status) {
      case "PENDING":
        return (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="signal"
              onClick={() => onAction(q.id, "SCHEDULED")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              Mark scheduled
            </Button>
            <Button
              variant="outline"
              onClick={() => onAction(q.id, "REJECTED")}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        );
      case "SCHEDULED":
        return (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="signal"
              onClick={() => setShowQuoteDialog(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Send quote
            </Button>
            <Button
              variant="outline"
              onClick={() => onAction(q.id, "REJECTED")}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        );
      case "QUOTED":
        return (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="signal"
              onClick={() => onAction(q.id, "ACCEPTED")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Mark accepted
            </Button>
            <Button
              variant="outline"
              onClick={() => onAction(q.id, "EXPIRED")}
              disabled={loading}
            >
              <Clock className="h-4 w-4 mr-1" /> Expire
            </Button>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 opacity-60" />
              Site visit request
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Status + timeline */}
            <div className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/50 px-4 py-3">
              <div>
                <p className="text-xs opacity-60 font-mono uppercase tracking-wide mb-1">Status</p>
                <Badge variant={STATUS_BADGE[q.status]}>{q.status}</Badge>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60">Submitted</p>
                <p className="text-sm font-medium">{timeAgo(q.createdAt)}</p>
                <p className="text-xs opacity-60 font-mono">{dateTime(q.createdAt)}</p>
              </div>
            </div>

            {/* Requester */}
            <div className="space-y-2">
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Requester</p>
              <div className="rounded-box border border-base-300 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 opacity-60 shrink-0" />
                  <span className="text-sm font-semibold">{q.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 opacity-60 shrink-0" />
                  <span className="text-sm font-mono">{q.phone}</span>
                </div>
              </div>
            </div>

            {/* Site address */}
            <div className="space-y-2">
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Site address</p>
              <div className="rounded-box border border-base-300 p-3 flex items-start gap-2">
                <MapPin className="h-4 w-4 opacity-60 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{q.address}</span>
              </div>
            </div>

            {/* Service requested */}
            {(q.serviceName || q.serviceId) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Service requested</p>
                <div className="rounded-box border border-base-300 p-3">
                  <p className="text-sm font-semibold">{q.serviceName ?? "Unknown service"}</p>
                  {q.serviceId && (
                    <p className="text-xs opacity-60 font-mono mt-0.5">{q.serviceId}</p>
                  )}
                </div>
              </div>
            )}

            {/* Preferred time */}
            {q.preferredTime && (
              <div className="space-y-2">
                <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Preferred time</p>
                <div className="rounded-box border border-base-300 p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 opacity-60 shrink-0" />
                  <span className="text-sm">{dateTime(q.preferredTime)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {q.notes && (
              <div className="space-y-2">
                <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Requirements</p>
                <div className="rounded-box border border-base-300 p-3 flex items-start gap-2">
                  <StickyNote className="h-4 w-4 opacity-60 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.notes}</p>
                </div>
              </div>
            )}

            {/* Quoted amount */}
            {q.quotedAmount != null && (
              <div className="space-y-2">
                <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">Quoted amount</p>
                <div className="rounded-box border border-base-300 p-3 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 opacity-60 shrink-0" />
                  <span className="text-lg font-bold">{inr(q.quotedAmount)}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            {actions && (
              <div className="pt-2 border-t border-base-300">
                {actions}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <QuoteDialog
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
        loading={loading}
        onConfirm={amount => {
          setShowQuoteDialog(false);
          onAction(q.id, "QUOTED", amount);
        }}
      />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Quotation["status"] | "ALL">("ALL");
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const { data: quotations = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["quotations", tab],
    queryFn: () => quotationsApi.list(tab === "ALL" ? {} : { status: tab }),
    retry: (failureCount, err) => !isApiNotFound(err) && failureCount < 2,
  });

  const apiUnavailable = isError && isApiNotFound(error);

  useQuotationEvents(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    }, [queryClient]),
  );

  const updateStatus = useMutation({
    mutationFn: ({ id, status, quotedAmount }: { id: string; status: Quotation["status"]; quotedAmount?: number }) =>
      quotationsApi.updateStatus(id, status, quotedAmount),
    onMutate: ({ id }) => setMutatingId(id),
    onSettled: () => setMutatingId(null),
    onSuccess: (updated) => {
      toast.success("Quotation updated");
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      // keep sheet open with updated data
      setSelected(prev => prev?.id === updated.id ? updated : prev);
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't update quotation")),
  });

  function handleAction(id: string, status: Quotation["status"], quotedAmount?: number) {
    updateStatus.mutate({ id, status, ...(quotedAmount !== undefined && { quotedAmount }) });
  }

  const TABS: { value: Quotation["status"] | "ALL"; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "QUOTED", label: "Quoted" },
    { value: "ACCEPTED", label: "Accepted" },
  ];

  return (
    <PageStack>
      <PageHeader
        eyebrow="Operations · Corporate"
        title="Quotation desk"
        description={
          apiUnavailable
            ? "The quotation admin API is not deployed on this environment yet."
            : "Site-visit requests and corporate enquiries. Triage → schedule visit → send quote → accept."
        }
      />

      {apiUnavailable ? (
        <ErrorState
          message="Quotation endpoints are not available on the connected backend."
          onRetry={() => refetch()}
        />
      ) : isError ? (
        <ErrorState
          message={getApiErrorMessage(error, "Could not load quotations.")}
          onRetry={() => refetch()}
        />
      ) : (
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList>
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          <DataTableWrapper
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError && quotations.length === 0}
            columns={7}
            emptyMessage="No quotation requests in this state."
            onRetry={() => refetch()}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">Requester</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">Service</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">Address</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">Notes</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">Submitted</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300">Status</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium opacity-60 border-b border-base-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map(q => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer hover:bg-base-200 transition-colors duration-150"
                    onClick={() => setSelected(q)}
                  >
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 opacity-60 shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{q.name}</div>
                          <div className="font-mono text-[10px] opacity-60">{q.phone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                      <span className="text-xs opacity-60">
                        {q.serviceName ?? (q.serviceId ? "—" : "General")}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                      <div className="max-w-[160px] truncate text-xs opacity-60">{q.address}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                      {q.notes ? (
                        <div className="max-w-[140px] truncate text-xs opacity-60 italic">{q.notes}</div>
                      ) : (
                        <span className="text-xs opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                      <span className="font-mono text-xs opacity-60">{dateTime(q.createdAt)}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200">
                      <Badge variant={STATUS_BADGE[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm border-b border-base-200 text-right" onClick={e => e.stopPropagation()}>
                      {(q.status === "PENDING" || q.status === "SCHEDULED") && (
                        <div className="inline-flex gap-1">
                          <Button
                            variant="signal"
                            size="sm"
                            disabled={mutatingId !== null}
                            onClick={() =>
                              q.status === "PENDING"
                                ? handleAction(q.id, "SCHEDULED")
                                : setSelected(q)
                            }
                          >
                            {mutatingId === q.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Check className="h-3.5 w-3.5" />}
                            {q.status === "PENDING" ? "Schedule" : "Quote"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={mutatingId !== null}
                            onClick={() => handleAction(q.id, "REJECTED")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {q.quotedAmount != null && (
                        <span className="text-xs font-semibold ml-2">
                          {inr(q.quotedAmount)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </TabsContent>
      </Tabs>
      )}

      {!apiUnavailable && (
      <QuotationSheet
        q={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onAction={handleAction}
        mutatingId={mutatingId}
      />
      )}
    </PageStack>
  );
}
