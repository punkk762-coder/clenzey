import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as repo from "./repository.ts";
import * as refundsService from "./service.ts";

/**
 * Initiate a refund for a booking.
 * Requires ADMIN auth.
 */
export const initiateRefund: RequestHandler = tryCatchUtil(async (req, res) => {
  const adminId = req.user?.sub;
  if (!adminId) throw new UnauthorizedError();

  const { amount, bookingId, reason } = req.body as {
    amount: number;
    bookingId: string;
    reason?: string;
  };

  const refund = await refundsService.initiateRefund({
    adminId,
    amount,
    bookingId,
    ...(reason !== undefined && { reason }),
  });

  return sendResponse(res, {
    data: { refund },
    statusCode: HttpStatusCode.Created,
  });
});

/**
 * List refund transactions with filters.
 * Requires ADMIN auth.
 */
export const listRefunds: RequestHandler = tryCatchUtil(async (req, res) => {
  const filters = (
    req as unknown as {
      validatedQuery: {
        bookingId?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        status?: string;
      };
    }
  ).validatedQuery;

  const result = await repo.listRefunds(filters);

  return sendResponse(res, { data: result });
});
