import type { RequestHandler } from "express";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as contactService from "./service.ts";

export const getPartnerContact: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user?.sub;
    if (!consumerId) throw new UnauthorizedError();

    const bookingId = req.params["id"] as string;
    const result = await contactService.getPartnerContact(bookingId, consumerId);

    return sendResponse(res, { data: result });
  },
);

export const getConsumerContact: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();

    const bookingId = req.params["id"] as string;
    const result = await contactService.getConsumerContact(bookingId, partnerId);

    return sendResponse(res, { data: result });
  },
);
