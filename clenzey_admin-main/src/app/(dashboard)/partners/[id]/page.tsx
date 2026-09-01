"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Edit,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Power,
  Star,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { RoleGate } from "@/components/auth/RoleGate";
import { PartnerZonesCard } from "@/components/partners/PartnerZonesCard";
import { SkillsDialog } from "@/components/partners/SkillsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { analyticsApi } from "@/lib/api/analytics";
import { bookingsApi } from "@/lib/api/bookings";
import { getApiErrorMessage } from "@/lib/api/errors";
import { partnersApi } from "@/lib/api/partners";
import { partnerOperationalStatusApi } from "@/lib/api/partnerOperationalStatus";
import { PartnerLiveMap } from "@/components/partners/PartnerLiveMapDynamic";
import { paymentsApi } from "@/lib/api/payments";
import { reviewsApi } from "@/lib/api/reviews";
import { formatDistanceToNow } from "date-fns";
import { servicesApi } from "@/lib/api/services";
import {
  dateShort,
  dateTime,
  formatPartnerRef,
  initials,
  inr,
  maskAccountNumber,
} from "@/lib/utils/format";
import type { ApprovalStatus, PartnerExtended } from "@/types";

const STATUS_VARIANT: Record<
  ApprovalStatus,
  "success" | "warning" | "destructive" | "muted"
> = {
  APPROVED: "success",
  PENDING: "warning",
  UNDER_REVIEW: "warning",
  SUSPENDED: "destructive",
  REJECTED: "destructive",
};

const BOOKING_STATUS_VARIANT: Record<
  string,
  "success" | "destructive" | "secondary" | "default"
> = {
  COMPLETED: "success",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
  NO_SHOW: "destructive",
  PENDING: "secondary",
  PAYMENT_PENDING: "secondary",
};

function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="opacity-60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [showSkillsDialog, setShowSkillsDialog] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { canOperate } = useAdminPermissions();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => partnersApi.get(id),
  });

  const { data: kyc, isLoading: kycLoading } = useQuery({
    queryKey: ["partner-kyc", id],
    queryFn: () => partnersApi.getKyc(id),
    enabled: !!partner,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
    enabled: !!partner,
  });

  const { data: performance } = useQuery({
    queryKey: ["partner-performance", id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const rows = await analyticsApi.partners({
        startDate: thirtyDaysAgo,
        endDate: today,
      });
      return rows.find((row) => row.partnerId === id) ?? null;
    },
    enabled: !!partner,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", "partner", id],
    queryFn: () => bookingsApi.list({ partnerId: id, limit: 100 }),
    enabled: !!partner,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["partner-reviews", id],
    queryFn: () =>
      reviewsApi.list({
        partnerId: id,
        limit: 10,
      }),
    enabled: !!partner,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["partner-payouts", id],
    queryFn: () => paymentsApi.payouts({ partnerId: id, limit: 10 }),
    enabled: !!partner,
  });

  const { data: operationalStatus } = useQuery({
    queryKey: ["partner-operational-status", id],
    queryFn: () => partnerOperationalStatusApi.get(id),
    enabled: !!partner,
    refetchInterval: 30_000,
  });

  const reviewDoc = useMutation({
    mutationFn: ({
      documentId,
      action,
      rejectionReason,
    }: {
      documentId: string;
      action: "APPROVE" | "REJECT";
      rejectionReason?: string;
    }) =>
      partnersApi.reviewKycDocument(documentId, action, rejectionReason),
    onSuccess: () => {
      toast.success("Document reviewed");
      queryClient.invalidateQueries({ queryKey: ["partner-kyc", id] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to review document")),
  });

  const approve = useMutation({
    mutationFn: () => partnersApi.approve(id),
    onSuccess: () => {
      toast.success("Partner approved");
      queryClient.invalidateQueries({ queryKey: ["partner", id] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't approve partner")),
  });

  const reject = useMutation({
    mutationFn: (reason: string) => partnersApi.reject(id, reason),
    onSuccess: () => {
      toast.success("Partner rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["partner", id] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't reject partner")),
  });

  const suspend = useMutation({
    mutationFn: () => partnersApi.suspend(id, "Admin action"),
    onSuccess: () => {
      toast.success("Partner status updated");
      queryClient.invalidateQueries({ queryKey: ["partner", id] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't update partner status")),
  });

  const extended = partner as PartnerExtended | undefined;
  const skillIds = extended?.skills ?? [];
  const monthlySalary = partner?.monthlySalary ?? null;
  const payrollActive = partner?.isPayrollActive ?? false;

  const skillNames = useMemo(
    () =>
      skillIds.map(
        (skillId) => services.find((s) => s.id === skillId)?.name ?? skillId,
      ),
    [skillIds, services],
  );

  const partnerBookings = useMemo(
    () =>
      (bookingsData?.bookings ?? [])
        .filter((booking) => booking.partnerId === id)
        .slice(0, 10),
    [bookingsData, id],
  );

  const isMutating =
    approve.isPending || reject.isPending || suspend.isPending;
  const isPending =
    partner?.approvalStatus === "PENDING" ||
    partner?.approvalStatus === "UNDER_REVIEW";
  const isApproved = partner?.approvalStatus === "APPROVED";
  const documents = kyc?.documents ?? [];

  if (isLoading || !partner) {
    return (
      <PageStack density="compact">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/partners">
            <ArrowLeft className="h-4 w-4" /> Back to directory
          </Link>
        </Button>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <Skeleton className="mx-auto h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageStack>
    );
  }

  const headerDescription = [
    partner.experienceYears != null
      ? `${partner.experienceYears} year${partner.experienceYears === 1 ? "" : "s"} experience`
      : null,
    partner.bio,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageStack density="compact">
      <section className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/partners">
            <ArrowLeft className="h-4 w-4" /> Back to directory
          </Link>
        </Button>

        <PageHeader
        eyebrow="Network · Partner Profile"
        title={partner.fullName ?? "Unnamed partner"}
        description={headerDescription || "No profile description provided."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[partner.approvalStatus]}>
              {partner.approvalStatus.replaceAll("_", " ")}
            </Badge>
            <Badge variant={partner.isAvailable ? "success" : "muted"}>
              {partner.isAvailable ? "Available" : "Unavailable"}
            </Badge>
            {isPending && canOperate && (
              <>
                <Button
                  variant="signal"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => approve.mutate()}
                >
                  {approve.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => setRejectDialogOpen(true)}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            )}
            {isApproved && (
              <>
                <RoleGate allow="operate">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isMutating}
                    onClick={() => suspend.mutate()}
                  >
                    {suspend.isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="mr-1 h-3.5 w-3.5" />
                    )}
                    Suspend partner
                  </Button>
                </RoleGate>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSkillsDialog(true)}
                >
                  <Edit className="mr-1 h-3.5 w-3.5" />
                  Edit skills
                </Button>
              </>
            )}
          </div>
        }
      />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-20 w-20 ring-2 ring-primary/30">
              {partner.profileImage && (
                <AvatarImage
                  src={partner.profileImage}
                  alt={partner.fullName ?? ""}
                />
              )}
              <AvatarFallback className="text-lg">
                {initials(partner.fullName ?? "??")}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-3 text-xl">
              {partner.fullName ?? "Unnamed"}
            </CardTitle>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              {partner.phone ?? "No phone on file"}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40">
              {formatPartnerRef(partner.id)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <StatRow
              label="Rating"
              value={
                <span className="inline-flex items-center gap-1 font-mono">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {partner.rating?.toFixed(2) ?? "—"}
                </span>
              }
            />
            <StatRow
              label="Total bookings"
              value={partner.totalBookings ?? 0}
            />
            <StatRow
              label="Experience"
              value={
                partner.experienceYears != null
                  ? `${partner.experienceYears} yr${partner.experienceYears === 1 ? "" : "s"}`
                  : "—"
              }
            />
            <StatRow
              label="Monthly salary"
              value={
                monthlySalary != null ? (
                  inr(monthlySalary)
                ) : (
                  <span className="opacity-60">Not set</span>
                )
              }
            />
            <StatRow
              label="Payroll"
              value={
                monthlySalary != null ? (
                  <Badge variant={payrollActive ? "success" : "muted"} className="text-[10px]">
                    {payrollActive ? "Active" : "Inactive"}
                  </Badge>
                ) : (
                  "—"
                )
              }
            />
            <StatRow
              label="Languages"
              value={(partner.languages ?? []).join(", ") || "—"}
            />
            <StatRow label="Joined" value={dateShort(partner.createdAt)} />
            <StatRow
              label="Approved"
              value={
                partner.approvalDate
                  ? dateShort(partner.approvalDate)
                  : "Not yet approved"
              }
            />
            <StatRow label="Last updated" value={dateShort(partner.updatedAt)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Network profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-xs uppercase tracking-wide opacity-60">
                  Monthly salary
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {monthlySalary != null ? inr(monthlySalary) : "Not set"}
                </p>
                {monthlySalary != null && (
                  <p className="mt-1 text-xs opacity-60">
                    Payroll {payrollActive ? "active" : "inactive"}
                    {partner.salaryEffectiveFrom
                      ? ` · effective ${dateShort(partner.salaryEffectiveFrom)}`
                      : ""}
                  </p>
                )}
                <RoleGate allow="finance">
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 h-auto px-0 text-xs"
                    asChild
                  >
                    <Link href="/payroll">Manage on payroll</Link>
                  </Button>
                </RoleGate>
              </div>
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-xs uppercase tracking-wide opacity-60">
                  30-day earnings
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {performance ? inr(performance.totalEarnings) : "—"}
                </p>
              </div>
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-xs uppercase tracking-wide opacity-60">
                  Completed bookings (30d)
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {performance?.bookingsCompleted ?? "—"}
                </p>
              </div>
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-xs uppercase tracking-wide opacity-60">
                  Acceptance rate
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {performance?.acceptanceRate != null
                    ? `${performance.acceptanceRate.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4 opacity-60" />
                Service skills
              </div>
              {skillNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillNames.map((skill) => (
                    <Badge key={skill} variant="muted">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-60">No skills assigned yet.</p>
              )}
            </div>

            <div className="space-y-3 rounded-box border border-base-300 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 opacity-60" />
                  Live status
                </div>
                {operationalStatus ? (
                  <Badge
                    variant={
                      operationalStatus.status === "IDLE"
                        ? "success"
                        : operationalStatus.status === "IN_TRANSIT"
                          ? "signal"
                          : operationalStatus.status === "ON_JOB"
                            ? "warning"
                            : "muted"
                    }
                  >
                    {operationalStatus.status.replaceAll("_", " ")}
                  </Badge>
                ) : (
                  <Badge variant="muted">Unknown</Badge>
                )}
              </div>
              <p
                className={`text-xs ${
                  operationalStatus?.lastSeenAt &&
                  Date.now() - new Date(operationalStatus.lastSeenAt).getTime() >
                    2 * 60_000
                    ? "text-warning"
                    : "opacity-60"
                }`}
              >
                {operationalStatus?.lastSeenAt
                  ? `Last seen ${formatDistanceToNow(new Date(operationalStatus.lastSeenAt), { addSuffix: true })}`
                  : "No location pings yet"}
              </p>
              {operationalStatus?.activeBookingId ? (
                <Link
                  href={`/bookings/${operationalStatus.activeBookingId}`}
                  className="text-xs text-primary hover:underline"
                >
                  Active booking{" "}
                  {operationalStatus.activeBookingNumber ??
                    operationalStatus.activeBookingId}
                </Link>
              ) : null}
              {operationalStatus?.latitude != null &&
              operationalStatus?.longitude != null ? (
                <div className="h-40 overflow-hidden rounded-box">
                  <PartnerLiveMap partners={[operationalStatus]} />
                </div>
              ) : (
                <p className="text-sm opacity-60">
                  Live map appears when the partner has a recent location ping.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Documents (KYC)</CardTitle>
          </CardHeader>
          <CardContent>
            {kycLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin opacity-60" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm opacity-60">
                No KYC documents submitted yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-box border border-base-300 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="h-4 w-4 shrink-0 opacity-60" />
                          <span>
                            {(doc.type ?? "Document").replaceAll("_", " ")}
                          </span>
                        </div>
                        {doc.uploadedAt && (
                          <p className="mt-1 text-xs opacity-50">
                            Uploaded {dateShort(doc.uploadedAt)}
                          </p>
                        )}
                        {doc.rejectionReason && (
                          <p className="mt-1 text-xs text-error">
                            {doc.rejectionReason}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          doc.status === "APPROVED"
                            ? "success"
                            : doc.status === "REJECTED"
                              ? "destructive"
                              : "muted"
                        }
                      >
                        {(doc.status ?? "PENDING").replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            View document
                          </a>
                        </Button>
                      )}
                      {doc.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={reviewDoc.isPending}
                            onClick={() =>
                              reviewDoc.mutate({
                                documentId: doc.id,
                                action: "APPROVE",
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={reviewDoc.isPending}
                            onClick={() =>
                              reviewDoc.mutate({
                                documentId: doc.id,
                                action: "REJECT",
                                rejectionReason: "Document rejected by admin",
                              })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Bank details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {kyc?.bankDetails ? (
              <>
                <StatRow
                  label="Account holder"
                  value={kyc.bankDetails.accountHolderName ?? "—"}
                />
                <StatRow
                  label="Account number"
                  value={maskAccountNumber(kyc.bankDetails.accountNumber)}
                />
                <StatRow
                  label="Bank"
                  value={kyc.bankDetails.bankName ?? "—"}
                />
                <StatRow
                  label="IFSC"
                  value={
                    <span className="font-mono text-xs">
                      {kyc.bankDetails.ifscCode ?? "—"}
                    </span>
                  }
                />
              </>
            ) : (
              <p className="text-sm opacity-60">No bank details on file.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-box" />
                ))}
              </div>
            ) : partnerBookings.length === 0 ? (
              <p className="text-sm opacity-60">
                No bookings found for this partner in the recent platform list.
              </p>
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
                    {partnerBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/bookings/${booking.id}`}
                            className="link link-primary font-mono text-xs no-underline hover:underline"
                          >
                            {booking.bookingNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div>{booking.serviceName}</div>
                          <div className="text-xs opacity-60">
                            {booking.variantLabel}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge
                            variant={
                              BOOKING_STATUS_VARIANT[booking.status] ??
                              "default"
                            }
                            className="text-[10px]"
                          >
                            {booking.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-medium">
                          {inr(booking.totalAmount)}
                        </td>
                        <td className="py-2.5 text-right text-xs opacity-60">
                          {dateTime(booking.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-box" />
                ))}
              </div>
            ) : (reviewsData?.data ?? []).length === 0 ? (
              <p className="text-sm opacity-60">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {(reviewsData?.data ?? []).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-box border border-base-300 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {review.consumerName || "Unknown customer"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {review.rating}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                      {review.text || (
                        <span className="italic opacity-50">No review text</span>
                      )}
                    </p>
                    <p className="mt-1 text-[10px] opacity-50">
                      {dateShort(review.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-box" />
                ))}
              </div>
            ) : (payoutsData?.data ?? []).length === 0 ? (
              <p className="text-sm opacity-60">No payouts recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide opacity-60">
                      <th className="pb-2 text-left font-medium">Amount</th>
                      <th className="pb-2 text-left font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payoutsData?.data ?? []).map((payout) => (
                      <tr key={payout.id}>
                        <td className="py-2.5 pr-4 font-medium">
                          {inr(
                            payout.amount ??
                              payout.commissionAmount ??
                              payout.volume ??
                              0,
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="muted" className="text-[10px]">
                            {payout.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-xs opacity-60">
                          {payout.createdAt
                            ? dateShort(payout.createdAt)
                            : "—"}
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

      <PartnerZonesCard partnerId={id} />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject partner</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || reject.isPending}
              onClick={() => reject.mutate(rejectReason.trim())}
            >
              Reject partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SkillsDialog
        partnerId={id}
        currentSkills={skillIds}
        open={showSkillsDialog}
        onClose={() => {
          setShowSkillsDialog(false);
          queryClient.invalidateQueries({ queryKey: ["partner", id] });
        }}
      />
    </PageStack>
  );
}
