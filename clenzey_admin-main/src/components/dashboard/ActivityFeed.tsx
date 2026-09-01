"use client";

import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  DollarSign,
  AlertTriangle,
  UserCheck,
  Radio,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import type { ActivityEvent } from "@/types";

const categoryIcons: Record<ActivityEvent["category"], LucideIcon> = {
  partner_onboarded: UserPlus,
  large_transaction: DollarSign,
  service_alert: AlertTriangle,
  partner_updated: UserCheck,
};

const categoryColors: Record<ActivityEvent["category"], string> = {
  partner_onboarded: "bg-success/15 text-success",
  large_transaction: "bg-primary/15 text-primary",
  service_alert: "bg-warning/15 text-warning",
  partner_updated: "bg-secondary/15 text-secondary",
};

export function ActivityFeed() {
  const { events } = useActivityFeed();
  const items = events.slice(0, 5);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">Recent Activity</h3>
          <p className="text-xs text-base-content/55">Live network events</p>
        </div>
        <Badge variant="success" size="xs" className="gap-1.5">
          <StatusDot variant="success" pulse />
          Streaming
        </Badge>
      </div>

      {items.length === 0 ? (
        <CardContent className="flex flex-1 flex-col items-center justify-center">
          <EmptyState
            icon={Radio}
            heading="Waiting for events"
            subtext="Bookings, partner updates, and alerts will stream here in real time."
          />
        </CardContent>
      ) : (
        <ul className="divide-y divide-base-200 overflow-y-auto">
          {items.map((event) => {
            const Icon = categoryIcons[event.category];
            const colorClass = categoryColors[event.category];

            return (
              <li key={event.id} className="flex gap-3 px-5 py-3.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{event.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-base-content/55">
                    {event.description}
                  </p>
                  <p className="mt-1 text-[10px] text-base-content/45">
                    {formatDistanceToNow(new Date(event.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
