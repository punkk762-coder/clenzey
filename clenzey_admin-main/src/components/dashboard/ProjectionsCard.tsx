"use client";

import { TrendingUp } from "lucide-react";

function formatProjection(value: number): string {
  const fixed = Math.abs(value).toFixed(1);
  if (value > 0) return `+${fixed}% FORECAST`;
  if (value < 0) return `−${fixed}% FORECAST`;
  return `${fixed}% FORECAST`;
}

export function ProjectionsCard({
  projectionPercentage,
}: {
  projectionPercentage: number;
}) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Q4 Projections
            </div>
            <div className="num text-2xl font-bold leading-none tracking-tight">
              {formatProjection(projectionPercentage)}
            </div>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled
            title="Projections PDF export is not available on the API yet"
            className="btn btn-outline btn-xs gap-2 font-mono uppercase tracking-[0.16em] btn-disabled"
          >
            Download Report (unavailable)
          </button>
        </div>
      </div>
    </div>
  );
}
