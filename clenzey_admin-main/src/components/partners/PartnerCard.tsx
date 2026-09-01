"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Edit,
  Loader2,
  Power,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initials, inr } from "@/lib/utils/format";
import type { PartnerExtended } from "@/types";

export type PartnerCardProps = {
  partner: PartnerExtended;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onEditSkills?: (id: string) => void;
  isMutating?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Active",
  PENDING: "Pending approval",
  UNDER_REVIEW: "Under review",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "destructive" | "muted"
> = {
  APPROVED: "success",
  PENDING: "warning",
  UNDER_REVIEW: "warning",
  SUSPENDED: "destructive",
  REJECTED: "destructive",
};

export function PartnerCard({
  partner,
  onApprove,
  onReject,
  onToggleStatus,
  onEditSkills,
  isMutating = false,
}: PartnerCardProps) {
  const isPending =
    partner.approvalStatus === "PENDING" ||
    partner.approvalStatus === "UNDER_REVIEW";
  const isActive = partner.approvalStatus === "APPROVED";

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            {partner.profileImage && (
              <AvatarImage src={partner.profileImage} alt={partner.fullName ?? ""} />
            )}
            <AvatarFallback>
              {initials(partner.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm font-medium">
              <Link
                href={`/partners/${partner.id}`}
                className="transition-colors hover:text-primary"
              >
                {partner.fullName ?? "Unnamed Partner"}
              </Link>
            </h3>
            <Badge
              variant={STATUS_VARIANT[partner.approvalStatus] ?? "muted"}
              size="sm"
              className="mt-1"
            >
              {STATUS_LABEL[partner.approvalStatus] ?? partner.approvalStatus}
            </Badge>
          </div>
        </div>

        {/* Monthly salary */}
        <div className="text-xs opacity-60">
          Monthly salary:{" "}
          <span className="font-mono font-medium">
            {partner.monthlySalary != null
              ? inr(partner.monthlySalary)
              : "Not set"}
          </span>
        </div>

        {/* Skill Badges */}
        {partner.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {partner.skills.map((skill) => (
              <Badge key={skill} variant="muted" size="xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-2">
          <div className="flex flex-wrap items-center gap-2">
          {isPending && (
            <>
              <Button
                variant="signal"
                size="sm"
                disabled={isMutating}
                onClick={() => onApprove?.(partner.id)}
              >
                {isMutating ? (
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
                onClick={() => onReject?.(partner.id)}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onToggleStatus?.(partner.id)}
              >
                {isMutating ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Power className="mr-1 h-3.5 w-3.5" />
                )}
                Toggle Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onEditSkills?.(partner.id)}
              >
                <Edit className="mr-1 h-3.5 w-3.5" />
                Edit Skills
              </Button>
            </>
          )}
          </div>
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link href={`/partners/${partner.id}`}>View Profile →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
