import type { RequestHandler } from "express";

import { approvalStatusEnum } from "../../../db/schema/enums.ts";
import { NotFoundError, UnauthorizedError } from "../../../errors/appErrors.ts";
import ErrorMsg from "../../../errors/errorMsg.ts";
import * as refreshTokenSessions from "../../../services/refreshTokenSessionService.ts";
import {
  ADMIN_REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "../../../utilities/authUtils.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as addressesRepo from "../addresses/repository.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import { ensurePartnerDispatchReady } from "../partners/dispatchBootstrap.ts";
import * as operationalStatus from "../partners/operationalStatus.ts";
import * as analytics from "./analytics.ts";
import * as adminRepo from "./repository.ts";
import * as adminService from "./service.ts";

type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];

const parseApprovalStatus = (value: unknown): ApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  return (approvalStatusEnum.enumValues as readonly string[]).includes(value)
    ? (value as ApprovalStatus)
    : undefined;
};

export const adminAuthLogin: RequestHandler = tryCatchUtil(async (req, res) => {
  const { username, password } = req.body;
  const adminUser = await adminService.login(username, password);
  const { accessToken, refreshToken } =
    await adminService.generateTokenPair(adminUser);

  setRefreshTokenCookie(res, refreshToken, ADMIN_REFRESH_TOKEN_COOKIE);

  return sendResponse(res, {
    data: {
      accessToken,
      user: {
        id: adminUser.id,
        phone: adminUser.phone,
        role: adminUser.role,
        username: adminUser.username,
      },
    },
  });
});

export const adminAuthRefresh: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const refreshToken = getRefreshTokenFromCookie(req, ADMIN_REFRESH_TOKEN_COOKIE);

    if (!refreshToken) {
      throw new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    let payload;
    try {
      payload = await refreshTokenSessions.assertRefreshTokenValid(
        refreshToken,
        "ADMIN",
      );
    } catch (err) {
      clearRefreshTokenCookie(res, ADMIN_REFRESH_TOKEN_COOKIE);
      throw err instanceof UnauthorizedError
        ? err
        : new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    const { accessToken, refreshToken: nextRefreshToken } =
      await adminService.refreshSession(refreshToken, payload);

    setRefreshTokenCookie(res, nextRefreshToken, ADMIN_REFRESH_TOKEN_COOKIE);
    return sendResponse(res, { data: { accessToken } });
  },
);

export const adminAuthLogout: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req, ADMIN_REFRESH_TOKEN_COOKIE);
    await refreshTokenSessions.revokeRefreshTokenString(refreshToken);
    clearRefreshTokenCookie(res, ADMIN_REFRESH_TOKEN_COOKIE);
    return sendResponse(res, { message: "Logged out successfully." });
  },
);


// ── Consumers ───────────────────────────────────────────────────────────────

export const listConsumers: RequestHandler = tryCatchUtil(async (req, res) => {
  const rawQuery = req.query["query"];
  const query =
    typeof rawQuery === "string" && rawQuery.trim().length > 0
      ? rawQuery.trim()
      : undefined;
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);

  const consumers = await adminRepo.listConsumers({ query, limit, offset });
  return sendResponse(res, { data: { consumers } });
});

export const getConsumer: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  const consumer = await adminRepo.getConsumerById(id);
  if (!consumer) throw new NotFoundError("Consumer not found.");
  return sendResponse(res, { data: { consumer } });
});

export const getConsumerAddresses: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  if (!(await adminRepo.getConsumerById(id))) throw new NotFoundError("Consumer not found.");
  const addresses = await addressesRepo.listAddressesForConsumer(id);
  return sendResponse(res, { data: { addresses } });
});

export const getConsumerBookings: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  if (!(await adminRepo.getConsumerById(id))) throw new NotFoundError("Consumer not found.");
  const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
  const bookingsList = await bookingsRepo.listBookings({ consumerId: id, limit, offset });
  return sendResponse(res, { data: { bookings: bookingsList } });
});

export const updateConsumer: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive === "boolean") {
    await adminRepo.setConsumerActive(id, isActive);
  }
  const consumer = await adminRepo.getConsumerById(id);
  if (!consumer) throw new NotFoundError("Consumer not found.");
  return sendResponse(res, { data: { consumer } });
});

// ── Partners ────────────────────────────────────────────────────────────────

export const listPartners: RequestHandler = tryCatchUtil(async (req, res) => {
  const approvalStatus = parseApprovalStatus(req.query["approvalStatus"]);
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);

  const partners = await adminRepo.listPartners({
    approvalStatus,
    limit,
    offset,
  });
  return sendResponse(res, { data: { partners } });
});

export const getPartner: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  const partner = await adminRepo.getPartnerById(id);
  if (!partner) throw new NotFoundError("Partner not found.");
  return sendResponse(res, { data: { partner } });
});

export const listPartnerOperationalStatuses: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const limit = Math.min(Number(req.query["limit"] ?? 100), 200);
    const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
    const result = await operationalStatus.listPartnerOperationalStatuses({
      limit,
      offset,
    });
    return sendResponse(res, {
      data: {
        partners: result.partners,
        total: result.total,
        limit,
        offset,
      },
    });
  },
);

export const getPartnerOperationalStatus: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const id = req.params["id"] as string;
    const snapshot = await operationalStatus.getPartnerOperationalStatus(id);
    if (!snapshot) throw new NotFoundError("Partner not found.");
    return sendResponse(res, { data: { partner: snapshot } });
  },
);

export const approvePartner: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  if (!(await adminRepo.partnerExists(id))) {
    throw new NotFoundError("Partner not found.");
  }
  await adminRepo.updateApprovalStatus({
    id,
    status: "APPROVED",
    approvedBy: req.user?.sub ?? null,
  });
  await ensurePartnerDispatchReady(id);
  const partner = await adminRepo.getPartnerById(id);
  return sendResponse(res, { data: { partner } });
});

export const rejectPartner: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  if (!(await adminRepo.partnerExists(id))) {
    throw new NotFoundError("Partner not found.");
  }
  const reason =
    typeof req.body?.reason === "string"
      ? (req.body.reason as string)
      : null;
  await adminRepo.updateApprovalStatus({ id, status: "REJECTED", reason });
  const partner = await adminRepo.getPartnerById(id);
  return sendResponse(res, { data: { partner } });
});

export const suspendPartner: RequestHandler = tryCatchUtil(async (req, res) => {
  const id = req.params["id"] as string;
  if (!(await adminRepo.partnerExists(id))) {
    throw new NotFoundError("Partner not found.");
  }
  const reason =
    typeof req.body?.reason === "string"
      ? (req.body.reason as string)
      : null;
  await adminRepo.updateApprovalStatus({ id, status: "SUSPENDED", reason });
  const partner = await adminRepo.getPartnerById(id);
  return sendResponse(res, { data: { partner } });
});


// ── KPI & Analytics ─────────────────────────────────────────────────────────

export const getKPIs: RequestHandler = tryCatchUtil(async (_req, res) => {
  const kpis = await analytics.getRealTimeKPIs();
  return sendResponse(res, { data: { kpis } });
});

export const getRevenueAnalytics: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const dateFrom = req.query["dateFrom"] as string;
    const dateTo = req.query["dateTo"] as string;
    const data = await analytics.getRevenueAnalytics(dateFrom, dateTo);
    return sendResponse(res, { data });
  },
);

export const getPartnerPerformance: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const dateFrom = req.query["dateFrom"] as string;
    const dateTo = req.query["dateTo"] as string;
    const data = await analytics.getPartnerPerformance(dateFrom, dateTo);
    return sendResponse(res, { data: { partners: data } });
  },
);

export const getCustomerAnalytics: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const dateFrom = req.query["dateFrom"] as string;
    const dateTo = req.query["dateTo"] as string;
    const data = await analytics.getCustomerAnalytics(dateFrom, dateTo);
    return sendResponse(res, { data });
  },
);

export const exportBookingsCsv: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const filters: analytics.BookingExportFilters = {
      dateFrom: req.query["dateFrom"] as string | undefined,
      dateTo: req.query["dateTo"] as string | undefined,
      status: req.query["status"] as string | undefined,
      serviceType: req.query["serviceType"] as string | undefined,
    };

    const rows = await analytics.getBookingsForExport(filters);
    const csv = analytics.bookingsToCsv(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bookings-export-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    return res.send(csv);
  },
);
