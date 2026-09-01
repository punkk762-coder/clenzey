"use client";

import { Activity } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type HubStatus = "OPERATIONAL" | "DEGRADED" | "OFFLINE";

const statusConfig: Record<HubStatus, { label: string; dot: string; text: string }> = {
  OPERATIONAL: {
    label: "Operational",
    dot: "bg-success",
    text: "text-success",
  },
  DEGRADED: {
    label: "Degraded",
    dot: "bg-warning",
    text: "text-warning",
  },
  OFFLINE: {
    label: "Offline",
    dot: "bg-error",
    text: "text-error",
  },
};

export function RegionalHubCard({
  hubName,
  activeNodes,
  status,
}: {
  hubName?: string;
  activeNodes?: number;
  status?: HubStatus;
}) {
  if (!hubName || activeNodes == null || !status) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Regional Hub
              </div>
              <div className="num text-lg font-bold leading-none tracking-tight opacity-60">
                Data unavailable
              </div>
            </div>
            <Activity className="h-5 w-5 opacity-60" strokeWidth={1.5} />
          </div>
          <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider opacity-50">
            Unable to load hub status
          </div>
        </div>
      </div>
    );
  }

  const config = statusConfig[status];

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Regional Hub
            </div>
            <div className="num text-lg font-bold leading-none tracking-tight">
              {hubName}
            </div>
          </div>
          <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
            {activeNodes} Active Nodes
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider",
              config.text,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}
