"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { connectSocket } from "@/lib/socket/client";
import type { ActivityEvent } from "@/types";

const MAX_EVENTS = 20;

type TimestampedPayload = {
  timestamp?: string;
};

function toTimestamp(payload: TimestampedPayload): string {
  return payload.timestamp ?? new Date().toISOString();
}

function pushEvent(
  setter: Dispatch<SetStateAction<ActivityEvent[]>>,
  event: ActivityEvent,
) {
  setter((prev) => [event, ...prev].slice(0, MAX_EVENTS));
}

export function useActivityFeed(): {
  events: ActivityEvent[];
  clearEvents: () => void;
} {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const socket = connectSocket();

    const onBookingCreated = (data: {
      bookingId: string;
      consumerId: string;
      timestamp?: string;
    }) => {
      pushEvent(setEvents, {
        id: `${data.bookingId}-created`,
        category: "large_transaction",
        title: "New booking received",
        description: `Booking ${data.bookingId.slice(0, 8)}… created`,
        timestamp: toTimestamp(data),
      });
    };

    const onBookingStatusChanged = (data: {
      bookingId: string;
      fromStatus: string;
      toStatus: string;
      timestamp?: string;
    }) => {
      pushEvent(setEvents, {
        id: `${data.bookingId}-${data.toStatus}-${toTimestamp(data)}`,
        category:
          data.toStatus === "COMPLETED" ? "large_transaction" : "partner_updated",
        title: `Booking ${data.toStatus.replaceAll("_", " ").toLowerCase()}`,
        description: `${data.fromStatus.replaceAll("_", " ")} → ${data.toStatus.replaceAll("_", " ")}`,
        timestamp: toTimestamp(data),
      });
    };

    const onQuotationCreated = (data: {
      quotationId?: string;
      id?: string;
      name?: string;
      timestamp?: string;
    }) => {
      const id = data.quotationId ?? data.id ?? crypto.randomUUID();
      pushEvent(setEvents, {
        id: `${id}-quotation`,
        category: "service_alert",
        title: "New quotation request",
        description: data.name ? `${data.name} requested a site visit` : "A new quotation was submitted",
        timestamp: toTimestamp(data),
      });
    };

    const onServiceCreated = (data: {
      serviceId?: string;
      id?: string;
      name?: string;
      timestamp?: string;
    }) => {
      const id = data.serviceId ?? data.id ?? crypto.randomUUID();
      pushEvent(setEvents, {
        id: `${id}-service`,
        category: "service_alert",
        title: "Service catalogue updated",
        description: data.name ? `${data.name} added to catalogue` : "A new service was published",
        timestamp: toTimestamp(data),
      });
    };

    const onPartnerProposed = (data: {
      bookingId: string;
      candidates?: string[];
      timestamp?: string;
    }) => {
      pushEvent(setEvents, {
        id: `${data.bookingId}-proposed`,
        category: "partner_onboarded",
        title: "Partners proposed for booking",
        description: `${data.candidates?.length ?? 0} partner(s) matched for assignment`,
        timestamp: toTimestamp(data),
      });
    };

    socket.on("booking:created", onBookingCreated);
    socket.on("booking:status_changed", onBookingStatusChanged);
    socket.on("booking:partner_proposed", onPartnerProposed);
    socket.on("quotation:created", onQuotationCreated);
    socket.on("service:created", onServiceCreated);

    return () => {
      socket.off("booking:created", onBookingCreated);
      socket.off("booking:status_changed", onBookingStatusChanged);
      socket.off("booking:partner_proposed", onPartnerProposed);
      socket.off("quotation:created", onQuotationCreated);
      socket.off("service:created", onServiceCreated);
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, clearEvents };
}
