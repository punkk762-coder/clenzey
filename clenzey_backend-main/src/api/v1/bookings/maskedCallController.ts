import type { RequestHandler } from "express";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as maskedCallService from "./maskedCallService.ts";

export const initiateCall: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user?.sub;
  if (!consumerId) throw new UnauthorizedError();

  const bookingId = req.params["bookingId"] as string;
  const result = await maskedCallService.initiateCall(bookingId, consumerId);

  return sendResponse(res, { data: result });
});
