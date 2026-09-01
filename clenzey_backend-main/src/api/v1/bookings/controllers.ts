import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import type { BookingAccessActorType } from "../../../utilities/bookingAccessControl.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as bookingsService from "./service.ts";
import * as availabilityService from "./availabilityService.ts";
import * as verifyStartService from "./verifyStartService.ts";
import type { ActorType, BookingStatus } from "./stateMachine.ts";

const resolveActor = (
  userType: string | undefined,
): ActorType => {
  if (userType === "CONSUMER" || userType === "PARTNER" || userType === "ADMIN")
    return userType;
  throw new UnauthorizedError("Unknown user type.");
};

const resolveBookingActor = (
  userType: string | undefined,
): BookingAccessActorType => {
  if (userType === "CONSUMER" || userType === "PARTNER" || userType === "ADMIN")
    return userType;
  throw new UnauthorizedError("Unknown user type.");
};

export const createBooking: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();

  const booking = await bookingsService.createBooking({
    ...req.body,
    consumerId,
  });

  return sendResponse(res, {
    data: { booking },
    statusCode: HttpStatusCode.Created,
  });
});

export const previewBooking: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();

  const preview = await bookingsService.previewBooking({
    ...req.body,
    consumerId,
  });
  return sendResponse(res, { data: { preview } });
});

export const checkAvailability: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();

  const result = await availabilityService.checkAvailability({
    ...req.body,
    consumerId,
  });

  return sendResponse(res, { data: result });
});

export const getBooking: RequestHandler = tryCatchUtil(async (req, res) => {
  const actor = resolveBookingActor(req.user?.userType);
  const userId = req.user?.sub;
  const id = req.params["bookingId"] as string;

  const booking = await bookingsService.getBookingById(id, {
    actorType: actor,
    ...(userId && { userId }),
  });
  return sendResponse(res, { data: { booking } });
});

export const listBookings: RequestHandler = tryCatchUtil(async (req, res) => {
  const actor = resolveActor(req.user?.userType);
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const q = (req as unknown as {
    validatedQuery: {
      dateFrom?: string;
      dateTo?: string;
      limit: number;
      offset: number;
      partnerId?: string;
      serviceId?: string;
      status?: BookingStatus;
      statuses?: BookingStatus[];
    };
  }).validatedQuery;

  const result = await bookingsService.listBookingsFor({
    actorType: actor,
    limit: q.limit,
    offset: q.offset,
    ...(q.status && { status: q.status }),
    ...(q.statuses?.length && { statuses: q.statuses }),
    ...(q.dateFrom && { dateFrom: q.dateFrom }),
    ...(q.dateTo && { dateTo: q.dateTo }),
    ...(q.serviceId && { serviceId: q.serviceId }),
    ...(q.partnerId && { partnerId: q.partnerId }),
    userId,
  });

  return sendResponse(res, {
    data: {
      bookings: result.bookings,
      limit: q.limit,
      offset: q.offset,
      ...(result.total !== undefined && { total: result.total }),
    },
  });
});

export const cancelBooking: RequestHandler = tryCatchUtil(async (req, res) => {
  const actor = resolveActor(req.user?.userType);
  const userId = req.user?.sub;
  const id = req.params["bookingId"] as string;
  const reason: string | undefined = req.body?.reason;

  const booking = await bookingsService.cancelBooking(
    id,
    actor,
    userId,
    reason,
  );
  return sendResponse(res, { data: { booking } });
});

export const listMyAssignments: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const assignments =
      await bookingsService.listOpenAssignmentsForPartner(partnerId);
    return sendResponse(res, { data: { assignments } });
  },
);

export const getMyAssignment: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const assignmentId = req.params["assignmentId"] as string;
    const assignment = await bookingsService.getAssignmentForPartner(
      assignmentId,
      partnerId,
    );
    return sendResponse(res, { data: { assignment } });
  },
);

export const acceptAssignment: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const assignmentId = req.params["assignmentId"] as string;
    const result = await bookingsService.acceptAssignment(
      assignmentId,
      partnerId,
    );
    return sendResponse(res, { data: { assignment: result } });
  },
);

export const declineAssignment: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const assignmentId = req.params["assignmentId"] as string;
    const reason = (req.body as { reason?: string })?.reason;
    const result = await bookingsService.declineAssignment(
      assignmentId,
      partnerId,
      reason,
    );
    return sendResponse(res, { data: { assignment: result } });
  },
);

export const transitionBooking: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const actor = resolveActor(req.user?.userType);
    const userId = req.user?.sub;
    const id = req.params["bookingId"] as string;
    const { metadata, reason, toStatus } = req.body as {
      metadata?: Record<string, unknown>;
      reason?: string;
      toStatus: BookingStatus;
    };

    const booking = await bookingsService.transitionBookingStatus({
      actor,
      ...(userId && { actorId: userId }),
      bookingId: id,
      ...(metadata && { metadata }),
      ...(reason && { reason }),
      toStatus,
    });

    return sendResponse(res, { data: { booking } });
  },
);

export const verifyStartBooking: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const id = req.params["bookingId"] as string;
    const { code } = req.body as { code: string };

    const booking = await verifyStartService.verifyAndStartJob({
      bookingId: id,
      code,
      partnerId,
    });

    return sendResponse(res, { data: { booking } });
  },
);

// ── Admin Manual Partner Assignment ──────────────────────────────────────────

export const adminAssignPartner: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const adminId = req.user?.sub;
    if (!adminId) throw new UnauthorizedError();

    const bookingId = req.params["id"] as string;
    const { partnerId } = req.body as { partnerId: string };

    const booking = await bookingsService.adminAssignPartner({
      adminId,
      bookingId,
      partnerId,
    });

    return sendResponse(res, { data: { booking } });
  },
);

export const listAssignablePartnersForBooking: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const bookingId = req.params["id"] as string;
    const partners =
      await bookingsService.listAssignablePartnersForBooking(bookingId);
    return sendResponse(res, { data: { partners } });
  },
);

// ── Booking Rescheduling ─────────────────────────────────────────────────────

export const rescheduleBooking: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user?.sub;
    if (!consumerId) throw new UnauthorizedError();

    const bookingId = req.params["id"] as string;
    const { newScheduledAt, timeSlotId } = req.body as {
      newScheduledAt: string;
      timeSlotId?: string;
    };

    const booking = await bookingsService.rescheduleBooking({
      bookingId,
      consumerId,
      newScheduledAt,
      timeSlotId,
    });

    return sendResponse(res, { data: { booking } });
  },
);
