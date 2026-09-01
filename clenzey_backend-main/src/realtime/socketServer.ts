import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer, type Socket } from "socket.io";

import * as bookingsRepo from "../api/v1/bookings/repository.ts";
import { resolveDispatchStatus } from "../api/v1/bookings/dispatchStatus.ts";
import { isAllowedCorsOrigin } from "../configs/corsConfig.ts";
import logger from "../configs/loggerConfig.ts";
import { verifyToken } from "../utilities/authUtils.ts";
import {
  bookingEvents,
  type BookingEventBase,
  type BookingStatusChangedEvent,
  type DispatchEscalatedEvent,
  type DispatchSearchingEvent,
  type PartnerLocationEvent,
  type PartnerLocationStreamEvent,
  type PartnerOperationalStatusEvent,
  type StaleLocationEvent,
} from "./bookingEvents.ts";
import {
  type AddressDeletedEvent,
  type AddressEventBase,
  domainEvents,
  type EtaUpdatedEvent,
  type IncentiveCreditedEvent,
  type QuotationEventBase,
  type ServiceDeletedEvent,
  type ServiceEventBase,
  type ZoneDeletedEvent,
  type ZoneEventBase,
} from "./domainEvents.ts";

type AuthedSocket = Socket & {
  data: {
    sub: string;
    userType: "ADMIN" | "CONSUMER" | "PARTNER";
  };
};

let io: null | SocketIOServer = null;

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isAllowedCorsOrigin(origin)) {
          callback(null, origin ?? true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization as string | undefined)?.replace(
        "Bearer ",
        "",
      );

    if (!token) {
      return next(new Error("Missing auth token"));
    }

    try {
      const payload = await verifyToken(token);
      if (!payload.sub || !payload.userType) {
        return next(new Error("Invalid token payload"));
      }
      (socket as AuthedSocket).data.sub = payload.sub;
      (socket as AuthedSocket).data.userType = payload.userType as
        | "ADMIN"
        | "CONSUMER"
        | "PARTNER";
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const s = socket as AuthedSocket;
    const { sub, userType } = s.data;

    // Auto-join personal room
    if (userType === "CONSUMER") {
      void s.join(`consumer:${sub}`);
      void s.join("consumers");
    }
    if (userType === "PARTNER") void s.join(`partner:${sub}`);
    if (userType === "ADMIN") void s.join("admins");

    logger.info(`Socket connected: ${userType} ${sub} (${s.id})`);

    // Consumer/partner subscribes to a booking room
    s.on("booking:subscribe", async ({ bookingId }: { bookingId: string }) => {
      if (typeof bookingId !== "string") return;

      // Look up the booking to verify ownership
      const booking = await bookingsRepo.findBookingById(bookingId);

      if (!booking) {
        s.emit("error", { code: "BOOKING_NOT_FOUND" });
        return;
      }

      if (s.data.sub !== booking.consumerId) {
        s.emit("error", { code: "UNAUTHORIZED" });
        return;
      }

      void s.join(`booking:${bookingId}`);

      const history = await bookingsRepo.findHistoryByBookingId(bookingId);
      const dispatchStatus = resolveDispatchStatus(booking, history);
      s.emit("booking:dispatch_status", {
        bookingId,
        consumerId: booking.consumerId,
        dispatchStatus,
        timestamp: new Date().toISOString(),
      });
    });

    s.on("booking:unsubscribe", ({ bookingId }: { bookingId: string }) => {
      if (typeof bookingId !== "string") return;
      void s.leave(`booking:${bookingId}`);
    });

    s.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${s.id}`);
    });
  });

  // ── Pipe domain events into rooms ──────────────────────────────────────
  bookingEvents.on("booking:status_changed", (e: BookingStatusChangedEvent) => {
    io?.to(`booking:${e.bookingId}`).emit("booking:status_changed", e);
    io?.to(`consumer:${e.consumerId}`).emit("booking:status_changed", e);
    if (e.partnerId) {
      io?.to(`partner:${e.partnerId}`).emit("booking:status_changed", e);
    }
    io?.to("admins").emit("booking:status_changed", e);
  });

  bookingEvents.on("booking:created", (e: BookingEventBase) => {
    io?.to(`consumer:${e.consumerId}`).emit("booking:created", e);
    io?.to("admins").emit("booking:created", e);
  });

  bookingEvents.on("booking:dispatch_searching", (e: DispatchSearchingEvent) => {
    io?.to(`booking:${e.bookingId}`).emit("booking:dispatch_searching", e);
    io?.to(`consumer:${e.consumerId}`).emit("booking:dispatch_searching", e);
    io?.to("admins").emit("booking:dispatch_searching", e);
  });

  bookingEvents.on("booking:dispatch_escalated", (e: DispatchEscalatedEvent) => {
    io?.to(`booking:${e.bookingId}`).emit("booking:dispatch_escalated", e);
    io?.to(`consumer:${e.consumerId}`).emit("booking:dispatch_escalated", e);
    io?.to("admins").emit("booking:dispatch_escalated", e);
  });

  bookingEvents.on(
    "booking:partner_proposed",
    (e: BookingEventBase & { candidates: string[] }) => {
      for (const partnerId of e.candidates) {
        io?.to(`partner:${partnerId}`).emit("booking:partner_proposed", {
          bookingId: e.bookingId,
          consumerId: e.consumerId,
          timestamp: e.timestamp,
        });
      }
    },
  );

  bookingEvents.on("partner:location", (e: PartnerLocationEvent) => {
    io?.to(`partner:${e.partnerId}`).emit("partner:location", e);
    // Broadcast to any booking rooms where this partner is the assigned partner.
    // Simpler approach: emit to admin + a global `partner-locations` namespace
    io?.to("admins").emit("partner:location", e);
  });

  bookingEvents.on(
    "partner:location_stream",
    (e: PartnerLocationStreamEvent) => {
      io?.to(`booking:${e.bookingId}`).emit("partner:location_stream", e);
      if (e.consumerId) {
        io?.to(`consumer:${e.consumerId}`).emit("partner:location_stream", e);
      }
    },
  );

  bookingEvents.on("partner:location_stale", (e: StaleLocationEvent) => {
    io?.to(`booking:${e.bookingId}`).emit("partner:location_stale", e);
    if (e.consumerId) {
      io?.to(`consumer:${e.consumerId}`).emit("partner:location_stale", e);
    }
  });

  bookingEvents.on(
    "partner:operational_status",
    (e: PartnerOperationalStatusEvent) => {
      io?.to("admins").emit("partner:operational_status", e);
    },
  );

  // ── Services: broadcast to admins + logged-in consumers ─────────────────
  domainEvents.on("service:created", (e: ServiceEventBase) => {
    io?.to("admins").emit("service:created", e);
    io?.to("consumers").emit("service:created", e);
  });
  domainEvents.on("service:updated", (e: ServiceEventBase) => {
    io?.to("admins").emit("service:updated", e);
    io?.to("consumers").emit("service:updated", e);
  });
  domainEvents.on("service:deleted", (e: ServiceDeletedEvent) => {
    io?.to("admins").emit("service:deleted", e);
    io?.to("consumers").emit("service:deleted", e);
  });

  // ── Zones: admins only ──────────────────────────────────────────────────
  domainEvents.on("zone:created", (e: ZoneEventBase) => {
    io?.to("admins").emit("zone:created", e);
  });
  domainEvents.on("zone:updated", (e: ZoneEventBase) => {
    io?.to("admins").emit("zone:updated", e);
  });
  domainEvents.on("zone:deleted", (e: ZoneDeletedEvent) => {
    io?.to("admins").emit("zone:deleted", e);
  });

  // ── Quotations: admins + owning consumer ────────────────────────────────
  domainEvents.on("quotation:created", (e: QuotationEventBase) => {
    io?.to("admins").emit("quotation:created", e);
    if (e.consumerId) io?.to(`consumer:${e.consumerId}`).emit("quotation:created", e);
  });
  domainEvents.on("quotation:updated", (e: QuotationEventBase) => {
    io?.to("admins").emit("quotation:updated", e);
    if (e.consumerId) io?.to(`consumer:${e.consumerId}`).emit("quotation:updated", e);
  });

  // ── Addresses: only the owning consumer ─────────────────────────────────
  domainEvents.on("address:created", (e: AddressEventBase) => {
    io?.to(`consumer:${e.consumerId}`).emit("address:created", e);
  });
  domainEvents.on("address:updated", (e: AddressEventBase) => {
    io?.to(`consumer:${e.consumerId}`).emit("address:updated", e);
  });
  domainEvents.on("address:deleted", (e: AddressDeletedEvent) => {
    io?.to(`consumer:${e.consumerId}`).emit("address:deleted", e);
  });

  // ── ETA: broadcast to booking participants ──────────────────────────────
  domainEvents.on("eta:updated", (e: EtaUpdatedEvent) => {
    io?.to(`booking:${e.bookingId}`).emit("eta:updated", e);
  });

  domainEvents.on("incentive:credited", (e: IncentiveCreditedEvent) => {
    io?.to(`partner:${e.partnerId}`).emit("incentive:credited", e);
  });

  return io;
};

export const closeSocketIO = async (): Promise<void> => {
  if (!io) return;

  const server = io;
  io = null;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
};

export const getIO = (): null | SocketIOServer => io;
