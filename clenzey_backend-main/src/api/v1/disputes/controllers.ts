import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as disputesService from "./service.ts";

export const createDispute: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  const userType = req.user?.userType;
  if (!userId || !userType) throw new UnauthorizedError();

  const { bookingId, category, description } = req.body as {
    bookingId: string;
    category: "SERVICE_QUALITY" | "PRICING" | "DAMAGE" | "NO_SHOW" | "OTHER";
    description: string;
  };

  const dispute = await disputesService.createDispute({
    bookingId,
    category,
    description,
    raisedById: userId,
    raisedByType: userType as "CONSUMER" | "PARTNER",
  });

  return sendResponse(res, {
    data: { dispute },
    statusCode: HttpStatusCode.Created,
  });
});

export const listMyDisputes: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const { limit, offset, status } = (
    req as unknown as {
      validatedQuery: {
        limit?: number;
        offset?: number;
        status?: disputesService.ListDisputesInput["status"];
      };
    }
  ).validatedQuery;

  const result = await disputesService.listDisputes(userId, {
    ...(limit !== undefined && { limit }),
    ...(offset !== undefined && { offset }),
    ...(status && { status }),
  });

  return sendResponse(res, { data: result });
});

export const getDispute: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const disputeId = req.params["id"] as string;
  const detail = await disputesService.getDisputeById(disputeId, userId);

  return sendResponse(res, { data: detail });
});

export const addDisputeEvidence: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedError();

    const disputeId = req.params["id"] as string;
    const { fileUrl } = req.body as { fileUrl: string };

    const evidence = await disputesService.addDisputeEvidence({
      disputeId,
      fileUrl,
      userId,
    });

    return sendResponse(res, {
      data: { evidence },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const listDisputeEvidence: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedError();

    const disputeId = req.params["id"] as string;
    const evidence = await disputesService.listDisputeEvidence(
      disputeId,
      userId,
    );

    return sendResponse(res, { data: { evidence } });
  },
);

export const getBookingDisputeStatus: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const userId = req.user?.sub;
    const userType = req.user?.userType;
    if (!userId || !userType) throw new UnauthorizedError();

    const bookingId = req.params["bookingId"] as string;
    const disputeStatus = await disputesService.getDisputeStatusForBooking(
      bookingId,
      userId,
      userType as "CONSUMER" | "PARTNER",
    );

    return sendResponse(res, { data: { disputeStatus } });
  },
);

export const listAdminDisputes: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const filters = (
      req as unknown as {
        validatedQuery: disputesService.ListDisputesInput;
      }
    ).validatedQuery;

    const result = await disputesService.listDisputesAdmin(filters);
    return sendResponse(res, { data: result });
  },
);

export const getAdminDispute: RequestHandler = tryCatchUtil(async (req, res) => {
  const disputeId = req.params["id"] as string;
  const detail = await disputesService.getAdminDisputeById(disputeId);
  return sendResponse(res, { data: detail });
});

export const updateDispute: RequestHandler = tryCatchUtil(async (req, res) => {
  const adminId = req.user?.sub;
  if (!adminId) throw new UnauthorizedError();

  const disputeId = req.params["id"] as string;
  const { resolutionNotes, status } = req.body as {
    resolutionNotes?: string;
    status: "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  };

  const dispute = await disputesService.updateDispute({
    adminId,
    disputeId,
    ...(resolutionNotes !== undefined && { resolutionNotes }),
    status,
  });

  return sendResponse(res, { data: { dispute } });
});
