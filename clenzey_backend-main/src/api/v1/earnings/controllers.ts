import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as earningsService from "./service.ts";

// ── Partner Controllers ──────────────────────────────────────────────────────

/**
 * GET /partners/earnings/summary
 * Returns earnings summary for the authenticated partner within a date range.
 */
export const getEarningsSummary: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();

    const { from, to } = (
      req as unknown as { validatedQuery: { from: string; to: string } }
    ).validatedQuery;

    const summary = await earningsService.getEarningsSummary(partnerId, {
      from,
      to,
    });

    return sendResponse(res, { data: { summary } });
  },
);

/**
 * GET /partners/earnings
 * Returns paginated earning transactions for the authenticated partner.
 */
export const listEarnings: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user?.sub;
  if (!partnerId) throw new UnauthorizedError();

  const { limit, offset } = (
    req as unknown as { validatedQuery: { limit?: number; offset?: number } }
  ).validatedQuery;

  const result = await earningsService.listEarnings(partnerId, {
    ...(limit !== undefined && { limit }),
    ...(offset !== undefined && { offset }),
  });

  return sendResponse(res, { data: result });
});

/**
 * GET /partners/payouts
 * Returns paginated payout history for the authenticated partner.
 */
export const listPartnerPayouts: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();

    const { limit, offset } = (
      req as unknown as { validatedQuery: { limit?: number; offset?: number } }
    ).validatedQuery;

    const result = await earningsService.listPayouts({
      partnerId,
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    });

    return sendResponse(res, { data: result });
  },
);

// ── Admin Controllers ────────────────────────────────────────────────────────

/**
 * GET /admin/payouts/available-balance
 * Returns how much can still be paid out to a partner.
 */
export const getPartnerAvailableBalance: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { partnerId } = (
      req as unknown as { validatedQuery: { partnerId: string } }
    ).validatedQuery;

    const availableBalance =
      await earningsService.getPartnerAvailableBalance(partnerId);

    return sendResponse(res, {
      data: { partnerId, availableBalance },
    });
  },
);

/**
 * POST /admin/payouts
 * Initiates a new payout for a partner.
 */
export const initiatePayout: RequestHandler = tryCatchUtil(async (req, res) => {
  const adminId = req.user?.sub;
  if (!adminId) throw new UnauthorizedError();

  const { amount, breakdown, notes, partnerId, periodEnd, periodStart } = req.body as {
    amount: number;
    breakdown?: {
      deductions?: number;
      incentives?: number;
      salary?: number;
    };
    notes?: string;
    partnerId: string;
    periodEnd?: string;
    periodStart?: string;
  };

  const payout = await earningsService.initiatePayout({
    adminId,
    amount,
    ...(breakdown !== undefined && { breakdown }),
    ...(notes !== undefined && { notes }),
    partnerId,
    ...(periodEnd !== undefined && { periodEnd }),
    ...(periodStart !== undefined && { periodStart }),
  });

  return sendResponse(res, {
    data: { payout },
    statusCode: HttpStatusCode.Created,
  });
});

/**
 * GET /admin/payouts
 * Lists all payouts with optional filters by partner, status.
 */
export const listAdminPayouts: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const filters = (
      req as unknown as {
        validatedQuery: {
          limit?: number;
          offset?: number;
          partnerId?: string;
          status?: string;
        };
      }
    ).validatedQuery;

    const result = await earningsService.listPayouts(filters);

    return sendResponse(res, { data: result });
  },
);

/**
 * PATCH /admin/payouts/:id/status
 * Updates payout status (PROCESSING, PAID, FAILED).
 */
export const updatePayoutStatus: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const adminId = req.user?.sub;
    if (!adminId) throw new UnauthorizedError();

    const payoutId = req.params["id"] as string;
    const { status } = req.body as {
      status: "PROCESSING" | "PAID" | "FAILED";
    };

    const payout = await earningsService.updatePayoutStatus(
      payoutId,
      status,
      adminId,
    );

    return sendResponse(res, { data: { payout } });
  },
);
