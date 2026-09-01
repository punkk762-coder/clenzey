"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { RoleGate } from "@/components/auth/RoleGate";
import { PartnerCard } from "@/components/partners/PartnerCard";
import { SkillsDialog } from "@/components/partners/SkillsDialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { partnersApi } from "@/lib/api/partners";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import type { Partner, PartnerExtended } from "@/types";

type TabValue = "ALL" | "ACTIVE" | "PENDING";

/** Map raw Partner data to PartnerExtended with defaults for missing fields */
function toExtended(partner: Partner): PartnerExtended {
  return {
    ...partner,
    skills: (partner as PartnerExtended).skills ?? [],
  };
}

export default function PartnersPage() {
  const queryClient = useQueryClient();
  const { canOperate } = useAdminPermissions();
  const [tab, setTab] = useState<TabValue>("ALL");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [editingSkillsPartnerId, setEditingSkillsPartnerId] = useState<string | null>(null);

  // Fetch all partners (unfiltered) so we can compute counts per tab client-side
  const { data: rawPartners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => partnersApi.list({ limit: 200 }),
  });

  const partners: PartnerExtended[] = useMemo(
    () => rawPartners.map(toExtended),
    [rawPartners],
  );

  // Compute counts
  const allCount = partners.length;
  const activeCount = partners.filter(
    (p) => p.approvalStatus === "APPROVED",
  ).length;
  const pendingCount = partners.filter(
    (p) => p.approvalStatus === "PENDING" || p.approvalStatus === "UNDER_REVIEW",
  ).length;

  // Filter partners by active tab
  const filteredPartners = useMemo(() => {
    switch (tab) {
      case "ACTIVE":
        return partners.filter((p) => p.approvalStatus === "APPROVED");
      case "PENDING":
        return partners.filter(
          (p) =>
            p.approvalStatus === "PENDING" ||
            p.approvalStatus === "UNDER_REVIEW",
        );
      default:
        return partners;
    }
  }, [partners, tab]);

  // Mutations
  const approve = useMutation({
    mutationFn: partnersApi.approve,
    onMutate: (id) => setMutatingId(id),
    onSettled: () => setMutatingId(null),
    onSuccess: () => {
      toast.success("Partner approved");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't approve partner")),
  });

  const reject = useMutation({
    mutationFn: (id: string) => partnersApi.reject(id, "Admin rejection"),
    onMutate: (id) => setMutatingId(id),
    onSettled: () => setMutatingId(null),
    onSuccess: () => {
      toast.success("Partner rejected");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't reject partner")),
  });

  const suspend = useMutation({
    mutationFn: (id: string) => partnersApi.suspend(id, "Admin action"),
    onMutate: (id) => setMutatingId(id),
    onSettled: () => setMutatingId(null),
    onSuccess: () => {
      toast.success("Partner status toggled");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't toggle partner status")),
  });

  return (
    <PageStack>
      <PageHeader
        eyebrow="Network · Partners"
        title="Partner Directory"
        description="Manage partner approvals, salaries, and skills across the network."
        actions={
          <RoleGate allow="finance">
            <Button variant="outline" asChild>
              <Link href="/payroll">Manage payroll</Link>
            </Button>
          </RoleGate>
        }
      />

      <PillTabs
        value={tab}
        onChange={(v) => setTab(v as TabValue)}
        ariaLabel="Filter partners by status"
        options={[
          { value: "ALL", label: "All partners", count: isLoading ? "…" : allCount },
          { value: "ACTIVE", label: "Active", count: isLoading ? "…" : activeCount },
          { value: "PENDING", label: "Pending", count: isLoading ? "…" : pendingCount },
        ]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="card admin-shell-card bg-base-100 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : filteredPartners.length === 0 ? (
        <EmptyState
          heading="No partners match this filter"
          subtext="Try switching to a different status tab."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              isMutating={mutatingId === partner.id}
              onApprove={canOperate ? (id) => approve.mutate(id) : undefined}
              onReject={canOperate ? (id) => reject.mutate(id) : undefined}
              onToggleStatus={canOperate ? (id) => suspend.mutate(id) : undefined}
              onEditSkills={canOperate ? (id) => setEditingSkillsPartnerId(id) : undefined}
            />
          ))}
        </div>
      )}

      <SkillsDialog
        partnerId={editingSkillsPartnerId}
        currentSkills={
          partners.find((p) => p.id === editingSkillsPartnerId)?.skills ?? []
        }
        open={editingSkillsPartnerId != null}
        onClose={() => setEditingSkillsPartnerId(null)}
      />
    </PageStack>
  );
}
