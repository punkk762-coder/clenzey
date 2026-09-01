import type { RequestHandler } from "express";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as etaService from "./service.ts";

export const getEta: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const bookingId = req.params["id"] as string;
  const result = await etaService.getBookingETA(bookingId, userId);

  return sendResponse(res, { data: result });
});
