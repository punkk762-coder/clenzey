"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { toast } from "@/lib/toast";

import { RoleGate } from "@/components/auth/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dispatchApi, type EscalatedBooking } from "@/lib/api/dispatch";
import { getApiErrorMessage } from "@/lib/api/errors";
import { dateTime } from "@/lib/utils/format";

function EscalatedActions({ booking }: { booking: EscalatedBooking }) {
  const queryClient = useQueryClient();

  const runAction = useMutation({
    mutationFn: async (action: "instant" | "redispatch" | "scheduled") => {
      if (action === "instant") {
        return dispatchApi.triggerInstant(booking.bookingId, true);
      }
      if (action === "redispatch") {
        return dispatchApi.triggerRedispatch(booking.bookingId, { sync: true });
      }
      return dispatchApi.triggerScheduledAssign(booking.bookingId, true);
    },
    onSuccess: (result) => {
      toast.success(
        result.queued
          ? `Dispatch queued (${result.queue})`
          : "Dispatch completed synchronously",
      );
      queryClient.invalidateQueries({ queryKey: ["dispatch-escalated"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Dispatch action failed")),
  });

  const isInstant = booking.bookingType === "INSTANT";

  return (
    <div className="flex flex-wrap gap-2">
      {isInstant ? (
        <>
          <Button
            size="sm"
            variant="signal"
            disabled={runAction.isPending}
            onClick={() => runAction.mutate("instant")}
          >
            Instant
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={runAction.isPending}
            onClick={() => runAction.mutate("redispatch")}
          >
            Redispatch
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="signal"
          disabled={runAction.isPending}
          onClick={() => runAction.mutate("scheduled")}
        >
          Assign
        </Button>
      )}
      <Button size="sm" variant="ghost" asChild>
        <Link href={`/bookings/${booking.bookingId}`}>Open</Link>
      </Button>
    </div>
  );
}

export default function DispatchPage() {
  const queryClient = useQueryClient();

  const escalatedQuery = useQuery({
    queryKey: ["dispatch-escalated"],
    queryFn: () => dispatchApi.listEscalated(),
    refetchInterval: 30_000,
  });

  const failedQuery = useQuery({
    queryKey: ["dispatch-failed"],
    queryFn: () => dispatchApi.listFailedJobs({ limit: 25, offset: 0 }),
    refetchInterval: 60_000,
  });

  const batchMutation = useMutation({
    mutationFn: () => dispatchApi.runScheduledBatch(true),
    onSuccess: () => {
      toast.success("Scheduled batch triggered");
      queryClient.invalidateQueries({ queryKey: ["dispatch-escalated"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Batch run failed")),
  });

  const retryMutation = useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      dispatchApi.retryFailedJob(queue, jobId),
    onSuccess: () => {
      toast.success("Job retry queued");
      queryClient.invalidateQueries({ queryKey: ["dispatch-failed"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Retry failed")),
  });

  const escalated = escalatedQuery.data ?? [];
  const failedJobs = failedQuery.data?.jobs ?? [];

  return (
    <PageStack>
      <PageHeader
        eyebrow="Operations · Dispatch"
        title="Dispatch console"
        description="Monitor escalated bookings, retry failed queue jobs, and trigger manual dispatch actions."
        actions={
          <RoleGate allow="operate">
            <Button
              variant="outline"
              size="sm"
              disabled={batchMutation.isPending}
              onClick={() => batchMutation.mutate()}
            >
              {batchMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Run scheduled batch
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Escalated bookings</CardTitle>
            <p className="text-sm opacity-60">
              Confirmed bookings with no partner after dispatch escalation.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => escalatedQuery.refetch()}
            disabled={escalatedQuery.isFetching}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {escalatedQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : escalated.length === 0 ? (
            <p className="text-sm opacity-60">No escalated bookings right now.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Escalated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalated.map((booking) => (
                  <TableRow key={booking.bookingId}>
                    <TableCell className="font-mono text-sm">
                      {booking.bookingNumber}
                    </TableCell>
                    <TableCell>{booking.serviceName}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{booking.bookingType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm opacity-70">
                      {dateTime(booking.escalatedAt)}
                    </TableCell>
                    <TableCell>
                      <RoleGate allow="operate">
                        <EscalatedActions booking={booking} />
                      </RoleGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failed queue jobs</CardTitle>
          <p className="text-sm opacity-60">
            BullMQ failures from the dispatch worker queues.
          </p>
        </CardHeader>
        <CardContent>
          {failedQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : failedQuery.isError ? (
            <p className="text-sm text-warning">
              Queue unavailable — dispatch workers may not be running in this
              environment.
            </p>
          ) : failedJobs.length === 0 ? (
            <p className="text-sm opacity-60">No failed jobs.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedJobs.map((job) => (
                  <TableRow key={`${job.queue}-${job.id}`}>
                    <TableCell className="font-mono text-xs">{job.queue}</TableCell>
                    <TableCell className="font-mono text-xs">{job.id}</TableCell>
                    <TableCell className="max-w-md truncate text-sm opacity-70">
                      {job.failedReason ?? "Unknown error"}
                    </TableCell>
                    <TableCell>
                      <RoleGate allow="operate">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryMutation.isPending}
                          onClick={() =>
                            retryMutation.mutate({
                              queue: job.queue,
                              jobId: job.id,
                            })
                          }
                        >
                          Retry
                        </Button>
                      </RoleGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageStack>
  );
}
