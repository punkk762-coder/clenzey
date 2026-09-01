"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { RoleGate } from "@/components/auth/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { disputesApi } from "@/lib/api/disputes";
import { getApiErrorMessage } from "@/lib/api/errors";
import { dateTime, inr } from "@/lib/utils/format";
import type { DisputeStatus } from "@/types";

const STATUSES: DisputeStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
];

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dispute-detail", id],
    queryFn: () => disputesApi.getDetail(id),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: { status?: DisputeStatus; resolutionNotes?: string }) =>
      disputesApi.update(id, patch),
    onSuccess: () => {
      toast.success("Dispute updated");
      queryClient.invalidateQueries({ queryKey: ["dispute-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Update failed")),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/disputes">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Loader2 className="h-5 w-5 animate-spin opacity-60" />
      </div>
    );
  }

  const { dispute, booking, evidence } = data;

  return (
    <PageStack density="compact">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/disputes">
          <ArrowLeft className="h-4 w-4" /> Back to disputes
        </Link>
      </Button>

      <PageHeader
        eyebrow="Operations · Dispute"
        title={`Dispute ${dispute.id.slice(0, 8).toUpperCase()}`}
        description={dispute.description}
        actions={
          <Badge variant="outline" size="sm">
            {dispute.status.replaceAll("_", " ")}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="opacity-60">Booking</span>
              <Link
                href={`/bookings/${booking.id}`}
                className="font-mono hover:underline"
              >
                {booking.bookingNumber}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Customer</span>
              <span>{booking.consumerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Status</span>
              <span>{booking.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Amount</span>
              <span>{inr(Number.parseFloat(booking.totalAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Parties</span>
              <span>
                {dispute.consumerName} · {dispute.partnerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Created</span>
              <span>{dateTime(dispute.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RoleGate allow="operate">
              <Select
                value={dispute.status}
                onValueChange={(value) =>
                  updateMutation.mutate({ status: value as DisputeStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={resolutionNotes || dispute.resolutionNotes || ""}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Resolution notes…"
                rows={4}
              />
              <Button
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    status: dispute.status,
                    resolutionNotes: resolutionNotes || dispute.resolutionNotes || "",
                  })
                }
              >
                Save resolution
              </Button>
            </RoleGate>
          </CardContent>
        </Card>
      </div>

      {evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evidence.map((item) => (
              <a
                key={item.id}
                href={item.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-primary underline-offset-2 hover:underline"
              >
                {item.fileUrl}
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </PageStack>
  );
}
