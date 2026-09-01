import { sql } from "drizzle-orm";

import { dispatchConfig } from "../../../configs/dispatchConfig.ts";
import logger from "../../../configs/loggerConfig.ts";
import db, { pool } from "../../../db/index.ts";
import { NotFoundError } from "../../../errors/appErrors.ts";
import { bookingEvents } from "../../../realtime/bookingEvents.ts";
import { calculateETA } from "../eta/service.ts";
import * as etaRepo from "../eta/repository.ts";
import * as notificationsService from "../notifications/service.ts";
import * as refundsService from "../refunds/service.ts";
import {
  type DispatchMode,
  expandRadius,
  findScoredCandidates,
} from "./assignmentEngine.ts";
import {
  resolveDispatchMetadata,
  resolveDispatchStatus,
  resolveSearchStartedAt,
} from "./dispatchStatus.ts";
import * as repo from "./repository.ts";
import { transitionBookingStatus } from "./service.ts";

export { resolveDispatchStatus };

export type AutoAssignResult =
  | {
      etaMinutes: number;
      partnerId: string;
      status: "ASSIGNED";
    }
  | {
      status: "ALREADY_ASSIGNED" | "BOOKING_NOT_ELIGIBLE" | "NO_CANDIDATES";
    };

export type AutoAssignInput = {
  bookingId: string;
  excludePartnerIds?: string[];
  maxRadiusMeters?: number;
  mode: DispatchMode;
};

const resolveDispatchMode = (
  bookingType: "INSTANT" | "SCHEDULED",
  explicitMode?: DispatchMode,
): DispatchMode => {
  if (explicitMode) return explicitMode;
  return bookingType === "INSTANT" ? "INSTANT" : "SCHEDULED_BATCH";
};

export const autoAssignPartner = async (
  input: AutoAssignInput,
): Promise<AutoAssignResult> => {
  const booking = await repo.findBookingById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  if (booking.partnerId) {
    return { status: "ALREADY_ASSIGNED" };
  }

  if (booking.status !== "CONFIRMED") {
    return { status: "BOOKING_NOT_ELIGIBLE" };
  }

  const address = await repo.findAddressById(booking.addressId);
  if (!address?.latitude || !address.longitude) {
    return { status: "NO_CANDIDATES" };
  }

  const zoneId = address.zoneId;
  if (!zoneId) {
    return { status: "NO_CANDIDATES" };
  }

  const latitude = Number(address.latitude);
  const longitude = Number(address.longitude);
  const maxRadius =
    input.maxRadiusMeters ?? dispatchConfig.initialRadiusM;
  const mode = resolveDispatchMode(booking.bookingType, input.mode);

  const candidates = await findScoredCandidates({
    ...(input.excludePartnerIds
      ? { excludePartnerIds: input.excludePartnerIds }
      : {}),
    latitude,
    limit: 1,
    longitude,
    maxRadiusMeters: maxRadius,
    mode,
    scheduledAt: booking.scheduledAt,
    scheduledEndAt: booking.scheduledEndAt,
    serviceId: booking.serviceId,
    zoneId,
  });

  if (candidates.length === 0) {
    logger.warn("Auto-assign found no partner candidates", {
      bookingId: input.bookingId,
      bookingType: booking.bookingType,
      mode,
      maxRadiusMeters: maxRadius,
      serviceId: booking.serviceId,
      zoneId,
    });
    return { status: "NO_CANDIDATES" };
  }

  const best = candidates[0]!;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lockedBooking = await client.query<{
      id: string;
      partner_id: string | null;
      status: string;
    }>(
      `SELECT id, partner_id, status
       FROM bookings
       WHERE id = $1
       FOR UPDATE`,
      [booking.id],
    );

    const row = lockedBooking.rows[0];
    if (!row || row.partner_id || row.status !== "CONFIRMED") {
      await client.query("ROLLBACK");
      return row?.partner_id
        ? { status: "ALREADY_ASSIGNED" }
        : { status: "BOOKING_NOT_ELIGIBLE" };
    }

    const partnerLock = await client.query(
      `SELECT id FROM partners WHERE id = $1 FOR UPDATE SKIP LOCKED`,
      [best.partnerId],
    );

    if (partnerLock.rowCount === 0) {
      await client.query("ROLLBACK");
      return { status: "NO_CANDIDATES" };
    }

    const now = new Date();
    await client.query(
      `UPDATE bookings
       SET partner_id = $1, partner_assigned_at = $2, updated_at = $2
       WHERE id = $3`,
      [best.partnerId, now, booking.id],
    );

    await client.query(
      `INSERT INTO booking_assignments (
        booking_id, partner_id, status, distance_meters, expires_at, proposed_at, responded_at
      ) VALUES ($1, $2, 'ACCEPTED', $3, $4, $4, $4)`,
      [booking.id, best.partnerId, best.distanceMeters, now],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const etaMinutes = calculateETA(
    best.latitude,
    best.longitude,
    latitude,
    longitude,
  );

  await etaRepo.upsertEta({
    bookingId: booking.id,
    distanceKm: String((best.distanceMeters / 1000) * 1.4),
    etaMinutes,
    lastPartnerLat: String(best.latitude),
    lastPartnerLng: String(best.longitude),
    updatedAt: new Date(),
  });

  await transitionBookingStatus({
    actor: "SYSTEM",
    bookingId: booking.id,
    metadata: {
      autoAssigned: true,
      distanceMeters: best.distanceMeters,
      etaMinutes,
      mode,
      partnerId: best.partnerId,
      type: "AUTO_ASSIGN",
    },
    reason: "Partner auto-assigned by dispatch engine",
    toStatus: "PROFESSIONAL_ASSIGNED",
  });

  await notificationsService.createNotification({
    body: `New booking assigned — please arrive in ~${etaMinutes} min for ${booking.serviceName} (${booking.bookingNumber}).`,
    channel: "PUSH",
    metadata: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      etaMinutes,
      type: "PARTNER_AUTO_ASSIGNED",
    },
    recipientId: best.partnerId,
    recipientType: "PARTNER",
    title: "New Booking Assignment",
  });

  await notificationsService.createNotification({
    body: `Your Clenzey Pro has been assigned and will arrive in ~${etaMinutes} minutes.`,
    channel: "PUSH",
    metadata: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      etaMinutes,
      partnerId: best.partnerId,
      type: "CONSUMER_PARTNER_ASSIGNED",
    },
    recipientId: booking.consumerId,
    recipientType: "CONSUMER",
    title: "Partner Assigned",
  });

  bookingEvents.emitStatusChanged({
    bookingId: booking.id,
    consumerId: booking.consumerId,
    fromStatus: "CONFIRMED",
    partnerId: best.partnerId,
    timestamp: new Date().toISOString(),
    toStatus: "PROFESSIONAL_ASSIGNED",
  });

  return {
    etaMinutes,
    partnerId: best.partnerId,
    status: "ASSIGNED",
  };
};

export type ProcessInstantDispatchResult = {
  escalated: boolean;
  maxRadiusReached: boolean;
  radiusMeters: number;
  status: "ASSIGNED" | "ESCALATED" | "NO_CANDIDATES" | "SKIPPED";
};

const getDispatchMetadata = async (bookingId: string) => {
  const history = await repo.findHistoryByBookingId(bookingId);
  return resolveDispatchMetadata(history);
};

export const publishDispatchSearching = async (
  bookingId: string,
): Promise<void> => {
  const booking = await repo.findBookingById(bookingId);
  if (
    !booking ||
    booking.partnerId ||
    booking.status !== "CONFIRMED" ||
    booking.bookingType !== "INSTANT"
  ) {
    return;
  }

  const history = await repo.findHistoryByBookingId(bookingId);
  const dispatchMeta = resolveDispatchMetadata(history);
  if (dispatchMeta.escalatedAt) return;

  const searchStartedAt = resolveSearchStartedAt(booking, history);
  const searchEndsAt = new Date(
    new Date(searchStartedAt).getTime() +
      dispatchConfig.escalationMin * 60_000,
  ).toISOString();

  bookingEvents.emitDispatchSearching({
    bookingId: booking.id,
    bookingType: booking.bookingType,
    consumerId: booking.consumerId,
    partnerId: booking.partnerId,
    searchEndsAt,
    searchStartedAt,
    timestamp: new Date().toISOString(),
  });
};

export const recordDispatchAttempt = async (
  bookingId: string,
  metadata: Record<string, unknown>,
  currentStatus: string,
): Promise<void> => {
  await repo.insertStatusHistory({
    actorType: null,
    bookingId,
    fromStatus: currentStatus as Parameters<
      typeof repo.insertStatusHistory
    >[0]["fromStatus"],
    metadata: { type: "DISPATCH_ATTEMPT", ...metadata },
    reason: "Dispatch attempt",
    toStatus: currentStatus as Parameters<
      typeof repo.insertStatusHistory
    >[0]["toStatus"],
  });
};

export const processInstantDispatch = async (
  bookingId: string,
  radiusMeters?: number,
): Promise<ProcessInstantDispatchResult> => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    return { escalated: false, maxRadiusReached: false, radiusMeters: 0, status: "SKIPPED" };
  }

  if (
    booking.bookingType !== "INSTANT" ||
    booking.partnerId ||
    booking.status !== "CONFIRMED"
  ) {
    return {
      escalated: false,
      maxRadiusReached: false,
      radiusMeters: radiusMeters ?? dispatchConfig.initialRadiusM,
      status: "SKIPPED",
    };
  }

  const dispatchMeta = await getDispatchMetadata(bookingId);
  if (dispatchMeta.escalatedAt) {
    return {
      escalated: true,
      maxRadiusReached: dispatchMeta.radiusMeters >= dispatchConfig.maxRadiusM,
      radiusMeters: dispatchMeta.radiusMeters,
      status: "ESCALATED",
    };
  }

  const radius = radiusMeters ?? dispatchMeta.radiusMeters;
  const firstDispatchAt =
    dispatchMeta.firstDispatchAt ?? new Date().toISOString();

  const result = await autoAssignPartner({
    bookingId,
    maxRadiusMeters: radius,
    mode: "INSTANT",
  });

  if (result.status === "ASSIGNED") {
    return {
      escalated: false,
      maxRadiusReached: false,
      radiusMeters: radius,
      status: "ASSIGNED",
    };
  }

  await recordDispatchAttempt(bookingId, {
    firstDispatchAt,
    radiusMeters: radius,
    result: result.status,
  }, booking.status);

  const elapsedMin =
    (Date.now() - new Date(firstDispatchAt).getTime()) / 60_000;
  const shouldEscalate =
    elapsedMin >= dispatchConfig.escalationMin && !dispatchMeta.escalatedAt;

  if (shouldEscalate) {
    await escalateToAdmin(bookingId, booking);
    return {
      escalated: true,
      maxRadiusReached: radius >= dispatchConfig.maxRadiusM,
      radiusMeters: radius,
      status: "ESCALATED",
    };
  }

  const maxRadiusReached = radius >= dispatchConfig.maxRadiusM;
  if (maxRadiusReached && elapsedMin >= dispatchConfig.escalationMin + 5) {
    await cancelAndRefundNoMatch(bookingId, booking);
    return {
      escalated: true,
      maxRadiusReached: true,
      radiusMeters: radius,
      status: "NO_CANDIDATES",
    };
  }

  return {
    escalated: false,
    maxRadiusReached,
    radiusMeters: radius,
    status: "NO_CANDIDATES",
  };
};

export const escalateToAdmin = async (
  bookingId: string,
  booking?: Awaited<ReturnType<typeof repo.findBookingById>>,
): Promise<boolean> => {
  const b = booking ?? (await repo.findBookingById(bookingId));
  if (!b || b.partnerId || b.status !== "CONFIRMED") return false;

  const history = await repo.findHistoryByBookingId(bookingId);
  const dispatchMeta = resolveDispatchMetadata(history);
  if (dispatchMeta.escalatedAt) return false;

  const escalatedAt = new Date().toISOString();
  const searchStartedAt = resolveSearchStartedAt(b, history);
  const searchEndsAt = new Date(
    new Date(searchStartedAt).getTime() +
      dispatchConfig.escalationMin * 60_000,
  ).toISOString();
  const message =
    "We're still finding the best partner. Our team has been notified and will assign someone shortly.";

  await repo.insertStatusHistory({
    actorType: null,
    bookingId,
    fromStatus: b.status,
    metadata: { escalatedAt, type: "DISPATCH_ESCALATED" },
    reason: "Dispatch escalated to admin for manual assignment",
    toStatus: b.status,
  });

  await notificationsService.createNotification({
    body: `Booking ${b.bookingNumber} could not be auto-assigned after ${dispatchConfig.escalationMin} minutes. Our team is assigning a partner manually.`,
    channel: "IN_APP",
    metadata: {
      bookingId: b.id,
      bookingNumber: b.bookingNumber,
      type: "DISPATCH_ESCALATED",
    },
    recipientId: b.consumerId,
    recipientType: "CONSUMER",
    title: "Finding your partner",
  });

  bookingEvents.emitDispatchEscalated({
    bookingId: b.id,
    consumerId: b.consumerId,
    escalatedAt,
    message,
    partnerId: b.partnerId,
    searchEndsAt,
    timestamp: escalatedAt,
  });

  logger.warn("Dispatch escalated to admin", {
    bookingId: b.id,
    bookingNumber: b.bookingNumber,
  });

  return true;
};

export const cancelAndRefundNoMatch = async (
  bookingId: string,
  booking?: Awaited<ReturnType<typeof repo.findBookingById>>,
): Promise<void> => {
  const b = booking ?? (await repo.findBookingById(bookingId));
  if (!b || b.partnerId) return;

  await transitionBookingStatus({
    actor: "SYSTEM",
    bookingId: b.id,
    metadata: { type: "DISPATCH_FAILED" },
    reason: "No partner available — auto-cancelled",
    toStatus: "CANCELLED",
  });

  try {
    await refundsService.initiateRefund({
      adminId: "00000000-0000-0000-0000-000000000000",
      amount: parseFloat(b.totalAmount),
      bookingId: b.id,
      reason: "No partner available for instant booking",
    });
  } catch (err) {
    logger.error("Auto-refund failed after dispatch timeout", {
      bookingId: b.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const processScheduledAssign = async (
  bookingId: string,
  mode: "SCHEDULED_BATCH" | "SCHEDULED_REVALIDATE" = "SCHEDULED_BATCH",
  excludePartnerIds?: string[],
): Promise<AutoAssignResult> => {
  return await autoAssignPartner({
    bookingId,
    ...(excludePartnerIds ? { excludePartnerIds } : {}),
    mode,
  });
};

export const revalidateScheduledBooking = async (
  bookingId: string,
): Promise<AutoAssignResult | { status: "OK" | "SKIPPED" }> => {
  const booking = await repo.findBookingById(bookingId);
  if (
    !booking ||
    booking.bookingType !== "SCHEDULED" ||
    !booking.partnerId ||
    !["CONFIRMED", "PROFESSIONAL_ASSIGNED"].includes(booking.status)
  ) {
    return { status: "SKIPPED" };
  }

  const address = await repo.findAddressById(booking.addressId);
  if (!address?.zoneId || !address.latitude || !address.longitude) {
    return { status: "SKIPPED" };
  }

  const staleMin = dispatchConfig.locationStaleMin;
  const partnerCheck = await db.execute<{ ok: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM partner_locations pl
      WHERE pl.partner_id = ${booking.partnerId}
        AND pl.is_online = true
        AND pl.location IS NOT NULL
        AND pl.last_seen_at > NOW() - (${staleMin} || ' minutes')::interval
    ) AS ok
  `);

  if (partnerCheck.rows[0]?.ok) {
    const overlap = await repo.hasOverlappingActiveBooking(
      booking.partnerId,
      booking.scheduledAt,
      booking.scheduledEndAt,
      booking.id,
    );
    if (!overlap) {
      return { status: "OK" };
    }
  }

  const previousPartnerId = booking.partnerId;

  if (booking.status === "PROFESSIONAL_ASSIGNED") {
    await repo.updateBooking(booking.id, { partnerId: null });
    await transitionBookingStatus({
      actor: "SYSTEM",
      bookingId: booking.id,
      metadata: {
        previousPartnerId,
        type: "REVALIDATE_REASSIGN",
      },
      reason: "Assigned partner unavailable — reassigning",
      toStatus: "CONFIRMED",
    });
  } else {
    await repo.updateBooking(booking.id, { partnerId: null });
  }

  const result = await autoAssignPartner({
    bookingId: booking.id,
    excludePartnerIds: [previousPartnerId],
    mode: "SCHEDULED_REVALIDATE",
  });

  if (result.status === "ASSIGNED") {
    await notificationsService.createNotification({
      body: `Your partner for booking ${booking.bookingNumber} has been updated. We'll see you at the scheduled time.`,
      channel: "PUSH",
      metadata: {
        bookingId: booking.id,
        previousPartnerId,
        type: "PARTNER_REASSIGNED",
      },
      recipientId: booking.consumerId,
      recipientType: "CONSUMER",
      title: "Partner Updated",
    });
  }

  return result;
};

export const listEscalatedBookings = async () => {
  const result = await db.execute<{
    booking_id: string;
    booking_number: string;
    booking_type: string;
    consumer_id: string;
    escalated_at: Date;
    scheduled_at: Date | null;
    service_name: string;
    status: string;
  }>(sql`
    SELECT DISTINCT ON (b.id)
      b.id AS booking_id,
      b.booking_number,
      b.booking_type,
      b.consumer_id,
      b.status,
      b.service_name,
      b.scheduled_at,
      h.created_at AS escalated_at
    FROM bookings b
    INNER JOIN booking_status_history h ON h.booking_id = b.id
    WHERE b.partner_id IS NULL
      AND b.status = 'CONFIRMED'
      AND h.metadata->>'type' = 'DISPATCH_ESCALATED'
    ORDER BY b.id, h.created_at DESC
  `);

  return result.rows.map((r) => ({
    bookingId: r.booking_id,
    bookingNumber: r.booking_number,
    bookingType: r.booking_type,
    consumerId: r.consumer_id,
    escalatedAt: new Date(r.escalated_at).toISOString(),
    scheduledAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null,
    serviceName: r.service_name,
    status: r.status,
  }));
};

export const findUnassignedScheduledBookings = async (
  windowStart: Date,
  windowEnd: Date,
) => {
  const result = await db.execute<{ id: string }>(sql`
    SELECT b.id
    FROM bookings b
    WHERE b.booking_type = 'SCHEDULED'
      AND b.status = 'CONFIRMED'
      AND b.partner_id IS NULL
      AND b.scheduled_at >= ${windowStart}
      AND b.scheduled_at < ${windowEnd}
  `);

  return result.rows.map((r) => r.id);
};

export const findBookingsDueForRevalidation = async (
  leadMin: number,
): Promise<string[]> => {
  const result = await db.execute<{ id: string }>(sql`
    SELECT b.id
    FROM bookings b
    WHERE b.booking_type = 'SCHEDULED'
      AND b.partner_id IS NOT NULL
      AND b.status IN ('CONFIRMED', 'PROFESSIONAL_ASSIGNED')
      AND b.scheduled_at > NOW()
      AND b.scheduled_at <= NOW() + (${leadMin + 5} || ' minutes')::interval
      AND b.scheduled_at >= NOW() + (${leadMin - 5} || ' minutes')::interval
  `);

  return result.rows.map((r) => r.id);
};

export { expandRadius };
