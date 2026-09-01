import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import ErrorMsg from "../../../errors/errorMsg.ts";
import { bookingEvents } from "../../../realtime/bookingEvents.ts";
import { domainEvents } from "../../../realtime/domainEvents.ts";
import * as refreshTokenSessions from "../../../services/refreshTokenSessionService.ts";
import {
  PARTNER_REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  deliverPartnerAuthTokens,
  getRefreshTokenFromRequest,
  isMobileClient,
} from "../../../utilities/authUtils.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import * as locationStreamService from "../bookings/locationStream.ts";
import * as etaService from "../eta/service.ts";
import * as partnerRepo from "./repository.ts";
import * as partnerService from "./service.ts";
import { emitPartnerOperationalStatus } from "./operationalStatus.ts";

export const partnerAuthFirebase: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { fullName, idToken } = req.body;

    const phone = await partnerService.authenticateWithFirebase(idToken);
    const { isNewPartner, user } = await partnerService.upsertPartner(
      phone,
      fullName,
    );
    const { accessToken, refreshToken } =
      await partnerService.generateTokenPair(user);

    const tokens = deliverPartnerAuthTokens(req, res, {
      accessToken,
      refreshToken,
    });

    return sendResponse(res, {
      data: {
        ...tokens,
        approvalStatus: user.partner?.approvalStatus ?? "PENDING",
        isNewPartner,
        user: {
          approvalStatus: user.partner?.approvalStatus ?? "PENDING",
          fullName: user.partner?.fullName ?? null,
          id: user.id,
          phone: user.phone,
        },
      },
      statusCode: isNewPartner ? HttpStatusCode.Created : HttpStatusCode.Ok,
    });
  },
);

export const partnerAuthRefresh: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(
      req,
      PARTNER_REFRESH_TOKEN_COOKIE,
    );
    if (!refreshToken) {
      throw new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    let payload;
    try {
      payload = await refreshTokenSessions.assertRefreshTokenValid(
        refreshToken,
        "PARTNER",
      );
    } catch (err) {
      clearRefreshTokenCookie(res, PARTNER_REFRESH_TOKEN_COOKIE);
      throw err instanceof UnauthorizedError
        ? err
        : new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    const user = await partnerRepo.findPartnerById(payload.sub);
    const userSummary = user
      ? {
          approvalStatus: user.partner?.approvalStatus ?? "PENDING",
          email: user.email,
          fullName: user.partner?.fullName ?? null,
          id: user.id,
          phone: user.phone,
        }
      : undefined;

    if (isMobileClient(req)) {
      const { accessToken, refreshToken: nextRefreshToken } =
        await partnerService.rotateRefreshSession(refreshToken, payload);
      return sendResponse(res, {
        data: { accessToken, refreshToken: nextRefreshToken, user: userSummary },
      });
    }

    const { accessToken } = await partnerService.refreshSession(payload);
    return sendResponse(res, { data: { accessToken, user: userSummary } });
  },
);

export const partnerAuthLogout: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(
      req,
      PARTNER_REFRESH_TOKEN_COOKIE,
    );
    await refreshTokenSessions.revokeRefreshTokenString(refreshToken);
    clearRefreshTokenCookie(res, PARTNER_REFRESH_TOKEN_COOKIE);
    return sendResponse(res, { message: "Logged out successfully." });
  },
);

export const getPartnerProfile: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user?.sub;
  if (!partnerId) throw new UnauthorizedError();
  const partner = await partnerService.getProfile(partnerId);
  return sendResponse(res, { data: { partner } });
});

export const updatePartnerProfile: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const partner = await partnerService.updateProfile(
      partnerId,
      req.body as partnerRepo.PartnerProfileUpdate,
    );
    return sendResponse(res, { data: { partner } });
  },
);

// ── Availability & location ─────────────────────────────────────────────────

export const listAvailability: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const availability = await partnerRepo.listAvailability(partnerId);
    return sendResponse(res, { data: { availability } });
  },
);

export const createAvailability: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const row = await partnerRepo.insertAvailability({
      ...req.body,
      partnerId,
    });
    return sendResponse(res, {
      data: { availability: row },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const deleteAvailability: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();
    const id = req.params["availabilityId"] as string;
    await partnerRepo.deleteAvailability(id, partnerId);
    return sendResponse(res, { data: { id } });
  },
);

export const pingLocation: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user?.sub;
  if (!partnerId) throw new UnauthorizedError();
  const body = req.body as {
    heading?: number;
    isOnline?: boolean;
    latitude: number;
    longitude: number;
    speed?: number;
  };
  await partnerRepo.upsertLocation({ ...body, partnerId });
  bookingEvents.emitPartnerLocation({
    heading: body.heading ?? null,
    isOnline: body.isOnline ?? true,
    latitude: body.latitude,
    longitude: body.longitude,
    partnerId,
    speed: body.speed ?? null,
    timestamp: new Date().toISOString(),
  });

  // Recalculate ETA if partner has an active en-route booking
  const activeEnRouteBooking =
    await bookingsRepo.findEnRouteBookingForPartner(partnerId);
  if (activeEnRouteBooking) {
    try {
      const eta = await etaService.recalculateETA(
        activeEnRouteBooking.id,
        body.latitude,
        body.longitude,
      );
      domainEvents.emitEtaUpdated({
        bookingId: activeEnRouteBooking.id,
        etaMinutes: eta.etaMinutes,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ETA recalculation failure should not block location ping response
    }
  }

  // Fire-and-forget: stream location to consumer via location stream service
  locationStreamService
    .handlePartnerPing(partnerId, {
      heading: body.heading ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      speed: body.speed ?? null,
    })
    .catch(() => {
      // Location streaming is non-critical — swallow errors silently
    });

  void emitPartnerOperationalStatus(partnerId);

  return sendResponse(res, { data: { ok: true } });
});

export const setOnline: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user?.sub;
  if (!partnerId) throw new UnauthorizedError();
  await partnerRepo.setOnlineStatus(partnerId, req.body.isOnline);
  void emitPartnerOperationalStatus(partnerId, { force: true });
  return sendResponse(res, { data: { isOnline: req.body.isOnline } });
});
