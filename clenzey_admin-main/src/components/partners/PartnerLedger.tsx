"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  Edit,
  Filter,
  Power,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inr } from "@/lib/utils/format";
import type { PartnerExtended } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PartnerLedgerProps = {
  partners: PartnerExtended[];
  onEdit?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onFilter?: () => void;
  onExport?: () => void;
};

type SortField = "id" | "fullName" | "skills" | "monthlySalary" | "approvalStatus";
type SortDirection = "asc" | "desc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format partner ID as #PRT-XXXX (zero-padded from last 4 chars of id) */
function formatPartnerId(id: string): string {
  const suffix = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `#PRT-${suffix}`;
}

/** Get the primary skill (first one) for display in the table */
function getPrimarySkill(skills: string[]): string {
  return skills[0] ?? "—";
}

/** Map skill to daisyUI badge variant */
function getSkillBadgeVariant(skill: string): "success" | "default" | "warning" | "muted" {
  switch (skill.toUpperCase()) {
    case "CLEANING":
      return "success";
    case "ELECTRICAL":
      return "default";
    case "PLUMBING":
      return "warning";
    default:
      return "muted";
  }
}

/** Determine status dot color */
function getStatusDotColor(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-success";
    default:
      return "bg-base-300";
  }
}

/** Determine status label */
function getStatusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Active";
    case "PENDING":
    case "UNDER_REVIEW":
      return "Pending";
    case "SUSPENDED":
      return "Suspended";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PartnerLedger({
  partners,
  onEdit,
  onToggleStatus,
  onFilter,
  onExport,
}: PartnerLedgerProps) {
  const [sortField, setSortField] = useState<SortField>("fullName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedPartners = useMemo(() => {
    const sorted = [...partners].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "id":
          comparison = a.id.localeCompare(b.id);
          break;
        case "fullName":
          comparison = (a.fullName ?? "").localeCompare(b.fullName ?? "");
          break;
        case "skills":
          comparison = getPrimarySkill(a.skills).localeCompare(
            getPrimarySkill(b.skills),
          );
          break;
        case "monthlySalary":
          comparison = (a.monthlySalary ?? 0) - (b.monthlySalary ?? 0);
          break;
        case "approvalStatus":
          comparison = a.approvalStatus.localeCompare(b.approvalStatus);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [partners, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      {/* Table Header with title and action icons */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Partner Ledger</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFilter}
            aria-label="Filter partners"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExport}
            aria-label="Export partners"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sortable Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                className="inline-flex items-center gap-1 hover:opacity-100 opacity-60"
                onClick={() => handleSort("id")}
              >
                ID
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>
              <button
                className="inline-flex items-center gap-1 hover:opacity-100 opacity-60"
                onClick={() => handleSort("fullName")}
              >
                Provider Name
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>
              <button
                className="inline-flex items-center gap-1 hover:opacity-100 opacity-60"
                onClick={() => handleSort("skills")}
              >
                Service Core
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>
              <button
                className="inline-flex items-center gap-1 hover:opacity-100 opacity-60"
                onClick={() => handleSort("monthlySalary")}
              >
                Monthly salary
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>
              <button
                className="inline-flex items-center gap-1 hover:opacity-100 opacity-60"
                onClick={() => handleSort("approvalStatus")}
              >
                Status
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPartners.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center opacity-60 py-8">
                No partners found.
              </TableCell>
            </TableRow>
          ) : (
            sortedPartners.map((partner) => (
              <TableRow key={partner.id}>
                {/* ID */}
                <TableCell className="font-mono text-xs opacity-60">
                  {formatPartnerId(partner.id)}
                </TableCell>

                {/* Provider Name */}
                <TableCell className="font-medium text-sm">
                  {partner.fullName ?? "Unnamed Partner"}
                </TableCell>

                {/* Service Core — color-coded badge */}
                <TableCell>
                  {partner.skills.length > 0 ? (
                    <Badge variant={getSkillBadgeVariant(partner.skills[0])}>
                      {partner.skills[0]}
                    </Badge>
                  ) : (
                    <span className="text-xs opacity-60">—</span>
                  )}
                </TableCell>

                {/* Monthly salary */}
                <TableCell className="font-mono text-sm">
                  {partner.monthlySalary != null
                    ? inr(partner.monthlySalary)
                    : "—"}
                </TableCell>

                {/* Status dot */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${getStatusDotColor(partner.approvalStatus)}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs opacity-60">
                      {getStatusLabel(partner.approvalStatus)}
                    </span>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(partner.id)}
                      aria-label={`Edit ${partner.fullName ?? "partner"}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus?.(partner.id)}
                      aria-label={`Toggle status for ${partner.fullName ?? "partner"}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
