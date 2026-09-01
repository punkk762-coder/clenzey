"use client";

import { useEffect, useState } from "react";

import { connectSocket } from "@/lib/socket/client";

export type BookingEvent =
  | {
      type: "booking.created";
      bookingId: string;
      consumerId: string;
      partnerId: string | null;
      timestamp: string;
    }
  | {
      type: "booking.status_changed";
      bookingId: string;
      consumerId: string;
      partnerId: string | null;
      fromStatus: string;
      toStatus: string;
      timestamp: string;
    }
  | {
      type: "booking.partner_proposed";
      bookingId: string;
      consumerId: string;
      candidates: string[];
      timestamp: string;
    };

const MAX_EVENTS = 50;

export function useBookingEvents(): {
  events: BookingEvent[];
  isConnected: boolean;
} {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const push = (evt: BookingEvent) => {
      setEvents((prev) => [evt, ...prev].slice(0, MAX_EVENTS));
    };

    const onCreated = (data: Omit<Extract<BookingEvent, { type: "booking.created" }>, "type">) =>
      push({ type: "booking.created", ...data });
    const onStatus = (data: Omit<Extract<BookingEvent, { type: "booking.status_changed" }>, "type">) =>
      push({ type: "booking.status_changed", ...data });
    const onProposed = (data: Omit<Extract<BookingEvent, { type: "booking.partner_proposed" }>, "type">) =>
      push({ type: "booking.partner_proposed", ...data });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    // Server emits event names with colons — must match here.
    socket.on("booking:created", onCreated);
    socket.on("booking:status_changed", onStatus);
    socket.on("booking:partner_proposed", onProposed);

    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("booking:created", onCreated);
      socket.off("booking:status_changed", onStatus);
      socket.off("booking:partner_proposed", onProposed);
    };
  }, []);

  return { events, isConnected };
}
