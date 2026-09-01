"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { useBookingEvents, type BookingEvent } from "@/hooks/useBookingEvents";
import { cn } from "@/lib/utils/cn";

const labelFor = (e: BookingEvent): string => {
  if (e.type === "booking.created") return "New booking";
  if (e.type === "booking.partner_proposed") return "Partner proposed";
  return `${e.fromStatus} → ${e.toStatus}`;
};

const variantFor = (e: BookingEvent) => {
  if (e.type === "booking.created") return "signal" as const;
  if (e.type === "booking.partner_proposed") return "warning" as const;
  if (e.type === "booking.status_changed") {
    if (e.toStatus === "COMPLETED") return "success" as const;
    if (e.toStatus === "CANCELLED") return "destructive" as const;
    return "default" as const;
  }
  return "muted" as const;
};

export function LiveFeed() {
  const { events, isConnected } = useBookingEvents();

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold">Live signal</h3>
          <p className="text-xs opacity-60">
            Realtime booking events from the socket channel.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider",
            isConnected ? "text-primary" : "opacity-60",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected ? "bg-primary animate-pulse-dot" : "bg-base-content/40",
            )}
          />
          {isConnected ? "Connected" : "Standby"}
        </span>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <span className="h-2 w-2 rounded-full bg-base-content/30" />
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Waiting for next event…
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-base-300">
            {events.map((evt, i) => (
              <li key={`${evt.bookingId}-${evt.timestamp}-${i}`}>
                <Link
                  href={`/bookings/${evt.bookingId}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-base-200"
                >
                  <Badge variant={variantFor(evt)} className="shrink-0">
                    {labelFor(evt)}
                  </Badge>
                  <div className="flex-1 truncate">
                    <div className="truncate font-mono text-xs">
                      {evt.bookingId.slice(0, 8)}…
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                    {formatDistanceToNow(new Date(evt.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
