"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { RoleGate } from "@/components/auth/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { AssignPartnerDialog } from "@/components/bookings/AssignPartnerDialog";
import { bookingsApi } from "@/lib/api/bookings";
import { getApiErrorMessage } from "@/lib/api/errors";
import { partnersApi } from "@/lib/api/partners";
import { buildLifecycleSteps } from "@/lib/bookings/lifecycle";
import {
  ADMIN_TRANSITION_NOTES,
  canAdminAssignPartner,
  getAdminNextStatuses,
} from "@/lib/bookings/transitions";
import {
  formatBookingAddress,
  formatPaymentStatus,
} from "@/lib/bookings/format";
import { dateTime, inr } from "@/lib/utils/format";
import type { BookingStatus } from "@/types";

const cardSurface = "card admin-shell-card bg-base-100 shadow-sm";

function parseAmount(value: string | undefined): number {
  const amount = parseFloat(value ?? "0");
  return Number.isFinite(amount) ? amount : 0;
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id),
  });

  const { data: partner } = useQuery({
    queryKey: ["partner", booking?.partnerId],
    queryFn: () => partnersApi.get(booking!.partnerId!),
    enabled: !!booking?.partnerId,
  });

  const lifecycleSteps = useMemo(
    () => (booking ? buildLifecycleSteps(booking) : []),
    [booking],
  );

  const transition = useMutation({
    mutationFn: ({
      toStatus,
      reason,
    }: {
      toStatus: BookingStatus;
      reason?: string;
    }) => bookingsApi.transition(id, toStatus, reason),
    onSuccess: (_, variables) => {
      toast.success(`Booking moved to ${variables.toStatus.replaceAll("_", " ").toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't transition booking")),
  });

  if (isLoading || !booking) {
    return (
      <PageStack density="compact">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4" /> Back to log
          </Link>
        </Button>
        <div className={`${cardSurface} p-12 text-center text-base-content/55`}>
          Loading booking…
        </div>
      </PageStack>
    );
  }

  const nextStatuses = getAdminNextStatuses(booking.status);
  const statusNote = ADMIN_TRANSITION_NOTES[booking.status];
  const descriptionParts = [
    booking.variantLabel,
    booking.estimatedDurationMin
      ? `${booking.estimatedDurationMin} mins`
      : null,
  ].filter(Boolean);

  const pricingLines = [
    ["Base price", booking.basePrice],
    ...(booking.addons.length > 0
      ? booking.addons.map(
          (addon) =>
            [
              `${addon.name}${addon.quantity > 1 ? ` × ${addon.quantity}` : ""}`,
              String(parseAmount(addon.price) * addon.quantity),
            ] as const,
        )
      : parseAmount(booking.addonsTotal) > 0
        ? ([["Add-ons", booking.addonsTotal!]] as const)
        : []),
    ...(parseAmount(booking.surgeAmount) > 0
      ? ([
          [
            `Surge (${booking.surgeMultiplier}x)`,
            booking.surgeAmount,
          ] as const,
        ] as const)
      : []),
    ["Discount", `-${booking.discountAmount}`],
    ["Tax", booking.taxAmount],
    ["Platform fee", booking.platformFee],
  ];

  return (
    <PageStack density="compact">
      <section className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4" /> Back to log
          </Link>
        </Button>

        <PageHeader
          eyebrow={booking.bookingNumber}
          title={booking.serviceName}
          description={descriptionParts.join(" · ")}
          actions={<StatusBadge status={booking.status} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Booking meta */}
          <div className={`${cardSurface} p-6`}>
            <h2 className="mb-4 text-base font-medium leading-none tracking-tight">
              Booking details
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  Type
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {booking.bookingType.replaceAll("_", " ")}
                </dd>
              </div>
              {booking.checkInCode ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide opacity-60">
                    Verification code
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold tracking-[0.2em]">
                      {booking.checkInCode}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        void navigator.clipboard.writeText(booking.checkInCode!);
                        toast.success("Verification code copied");
                      }}
                    >
                      Copy
                    </Button>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  Scheduled
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  {booking.scheduledAt
                    ? dateTime(booking.scheduledAt)
                    : "Instant booking"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  Payment
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm">
                  <CreditCard className="h-3.5 w-3.5 opacity-60" />
                  <span>{formatPaymentStatus(booking.paymentStatus)}</span>
                  {booking.paymentMode && (
                    <Badge variant="muted" className="text-[10px]">
                      {booking.paymentMode}
                    </Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  Created
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 opacity-60" />
                  {dateTime(booking.createdAt)}
                </dd>
              </div>
            </dl>
            {booking.cancellationReason && (
              <div className="mt-4 rounded-box border border-error/20 bg-error/5 px-4 py-3 text-sm">
                <span className="font-medium text-error">Cancellation reason: </span>
                {booking.cancellationReason}
              </div>
            )}
          </div>

          {/* Lifecycle timeline */}
          <div className={`${cardSurface} p-6`}>
            <h2 className="mb-6 text-base font-medium leading-none tracking-tight">
              Lifecycle
            </h2>
            <ol className="relative space-y-4 border-l-2 border-base-300 pl-5">
              {lifecycleSteps.map((step) => (
                <li key={step.status} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 ${
                      step.isCurrent
                        ? "border-primary bg-primary ring-4 ring-primary/20"
                        : step.isCompleted
                          ? "border-primary bg-primary"
                          : "border-base-300 bg-base-100"
                    }`}
                  />
                  <div
                    className={`text-sm ${
                      step.isCurrent ? "font-semibold text-primary" : ""
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                    {step.at ? dateTime(step.at) : "—"}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className={`${cardSurface} p-6`}>
            <h2 className="mb-4 text-base font-medium leading-none tracking-tight">
              Actions
            </h2>
            {statusNote && (
              <p className="mb-4 text-sm leading-relaxed text-base-content/70">
                {statusNote}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <RoleGate allow="operate">
                {canAdminAssignPartner(booking.status, booking.partnerId) && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                  >
                    Assign partner
                  </Button>
                )}
                {nextStatuses
                  .filter((s) => s !== "CANCELLED")
                  .map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => transition.mutate({ toStatus: s })}
                      disabled={transition.isPending}
                    >
                      → {s.replaceAll("_", " ")}
                    </Button>
                  ))}
                {nextStatuses.includes("CANCELLED") && (
                  <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Cancel booking
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel booking?</DialogTitle>
                        <DialogDescription>
                          Provide a reason. The customer will be notified, and
                          any reserved slot or payment will be released.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Input
                          id="reason"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Service unavailable in this zone"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          onClick={() => setCancelOpen(false)}
                        >
                          Keep booking
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            transition.mutate(
                              {
                                toStatus: "CANCELLED",
                                ...(cancelReason && { reason: cancelReason }),
                              },
                              {
                                onSettled: () => setCancelOpen(false),
                              },
                            );
                          }}
                          disabled={transition.isPending}
                        >
                          Cancel booking
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </RoleGate>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Pricing */}
          <div className={`${cardSurface} p-6`}>
            <h2 className="mb-4 text-base font-medium leading-none tracking-tight">
              Pricing
            </h2>
            <div className="space-y-2 text-sm">
              {pricingLines.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="opacity-60">{label}</span>
                  <span className="font-mono">{inr(value)}</span>
                </div>
              ))}
              <div className="divider my-2" />
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-mono text-base">
                  {inr(booking.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className={`${cardSurface} p-6`}>
            <h2 className="mb-4 text-base font-medium leading-none tracking-tight">
              Customer
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 opacity-60" />
                <Link
                  href={`/customers/${booking.consumerId}`}
                  className="link link-primary no-underline hover:underline"
                >
                  {booking.consumerName}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 opacity-60" />
                <span className="font-mono">{booking.consumerPhone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
                <span className="leading-relaxed opacity-80">
                  {formatBookingAddress(booking.addressSnapshot)}
                </span>
              </div>
            </div>
          </div>

          {/* Partner */}
          {booking.partnerId && (
            <div className={`${cardSurface} p-6`}>
              <h2 className="mb-4 text-base font-medium leading-none tracking-tight">
                Partner
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 opacity-60" />
                <Link
                  href={`/partners/${booking.partnerId}`}
                  className="link link-primary no-underline hover:underline"
                >
                  {partner?.fullName ?? "View assigned partner"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <AssignPartnerDialog
        bookingId={assignOpen ? id : null}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ["booking", id] });
        }}
      />
    </PageStack>
  );
}
