"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils/cn";

type Row = { category: string; values: number[] };

const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i);

const intensity = (v: number, max: number) => {
  if (max === 0) return 0;
  return Math.min(1, v / max);
};

export function CategoryHeatmap({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="flex items-end justify-between border-b border-base-300 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold">Service heatmap</h3>
          <p className="text-xs opacity-60">
            Bookings by service & hour of day · last 7 days.
          </p>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
          08:00 → 19:00
        </div>
      </div>
      <div className="overflow-x-auto p-5">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[140px_repeat(12,1fr)] items-center gap-1.5">
            <div />
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-center font-mono text-[9px] uppercase tracking-[0.14em] opacity-60"
              >
                {h.toString().padStart(2, "0")}
              </div>
            ))}
            {rows.map((row) => (
              <Fragment key={row.category}>
                <div className="truncate pr-2 text-xs opacity-80">
                  {row.category}
                </div>
                {row.values.map((v, i) => {
                  const t = intensity(v, max);
                  return (
                    <div
                      key={`${row.category}-${i}`}
                      title={`${v} bookings`}
                      className={cn(
                        "aspect-square rounded-sm border border-base-300/40 transition-colors",
                      )}
                      style={{
                        background: `oklch(var(--p) / ${t * 0.85})`,
                      }}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider opacity-60">
            <span>Low</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full border border-base-300">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    background: `oklch(var(--p) / ${((i + 1) / 12) * 0.85})`,
                  }}
                />
              ))}
            </div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
