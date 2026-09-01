"use client";

import { type ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/context";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "@/lib/socket/client";
import type { Service, Zone } from "@/types";

type ServicePayload = { service: Service; timestamp: string };
type ServiceDeletedPayload = { serviceId: string; timestamp: string };
type ZonePayload = { timestamp: string; zone: Zone };
type ZoneDeletedPayload = { timestamp: string; zoneId: string };

export function SocketProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "authenticated") {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();

    // ── Services ────────────────────────────────────────────────────────
    const onServiceCreated = ({ service }: ServicePayload) => {
      queryClient.setQueryData<Service[]>(["services"], (prev) =>
        prev ? [...prev.filter((s) => s.id !== service.id), service] : [service],
      );
      queryClient.setQueryData(["service", service.id], service);
    };
    const onServiceUpdated = ({ service }: ServicePayload) => {
      queryClient.setQueryData<Service[]>(["services"], (prev) =>
        prev?.map((s) => (s.id === service.id ? service : s)) ?? [service],
      );
      queryClient.setQueryData(["service", service.id], service);
    };
    const onServiceDeleted = ({ serviceId }: ServiceDeletedPayload) => {
      queryClient.setQueryData<Service[]>(["services"], (prev) =>
        prev?.filter((s) => s.id !== serviceId),
      );
      queryClient.removeQueries({ queryKey: ["service", serviceId] });
    };

    // ── Zones ───────────────────────────────────────────────────────────
    const onZoneCreated = ({ zone }: ZonePayload) => {
      queryClient.setQueryData<Zone[]>(["zones"], (prev) =>
        prev ? [...prev.filter((z) => z.id !== zone.id), zone] : [zone],
      );
      queryClient.setQueryData(["zone", zone.id], zone);
    };
    const onZoneUpdated = ({ zone }: ZonePayload) => {
      queryClient.setQueryData<Zone[]>(["zones"], (prev) =>
        prev?.map((z) => (z.id === zone.id ? { ...z, ...zone } : z)) ?? [zone],
      );
      queryClient.setQueryData<Zone | undefined>(["zone", zone.id], (prev) =>
        prev ? { ...prev, ...zone } : zone,
      );
    };
    const onZoneDeleted = ({ zoneId }: ZoneDeletedPayload) => {
      queryClient.setQueryData<Zone[]>(["zones"], (prev) =>
        prev?.filter((z) => z.id !== zoneId),
      );
      queryClient.removeQueries({ queryKey: ["zone", zoneId] });
    };

    socket.on("service:created", onServiceCreated);
    socket.on("service:updated", onServiceUpdated);
    socket.on("service:deleted", onServiceDeleted);
    socket.on("zone:created", onZoneCreated);
    socket.on("zone:updated", onZoneUpdated);
    socket.on("zone:deleted", onZoneDeleted);

    const invalidateBookings = () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    };
    const onBookingCreated = () => invalidateBookings();
    const onBookingStatusChanged = (data: { bookingId?: string }) => {
      invalidateBookings();
      if (data.bookingId) {
        queryClient.invalidateQueries({ queryKey: ["booking", data.bookingId] });
      }
    };

    socket.on("booking:created", onBookingCreated);
    socket.on("booking:status_changed", onBookingStatusChanged);

    return () => {
      socket.off("service:created", onServiceCreated);
      socket.off("service:updated", onServiceUpdated);
      socket.off("service:deleted", onServiceDeleted);
      socket.off("zone:created", onZoneCreated);
      socket.off("zone:updated", onZoneUpdated);
      socket.off("zone:deleted", onZoneDeleted);
      socket.off("booking:created", onBookingCreated);
      socket.off("booking:status_changed", onBookingStatusChanged);
    };
  }, [status, queryClient]);

  // Clean up the socket on full unmount (e.g. provider tree changes)
  useEffect(() => {
    return () => {
      const s = getSocket();
      s.removeAllListeners();
      disconnectSocket();
    };
  }, []);

  return <>{children}</>;
}
