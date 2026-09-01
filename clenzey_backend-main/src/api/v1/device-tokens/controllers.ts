import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as deviceTokenService from "./service.ts";

export const registerPartnerToken: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user!.sub;
    const { deviceToken, platform } = req.body;
    const record = await deviceTokenService.registerToken({
      deviceToken,
      platform,
      userId: partnerId,
      userType: "PARTNER",
    });
    return sendResponse(res, {
      data: { deviceToken: record },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const removePartnerToken: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user!.sub;
    const { deviceToken } = req.body;
    await deviceTokenService.removeToken(deviceToken, partnerId);
    return sendResponse(res, {
      data: { message: "Device token removed." },
    });
  },
);

export const registerConsumerToken: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user!.sub;
    const { deviceToken, platform } = req.body;
    const record = await deviceTokenService.registerToken({
      deviceToken,
      platform,
      userId: consumerId,
      userType: "CONSUMER",
    });
    return sendResponse(res, {
      data: { deviceToken: record },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const removeConsumerToken: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user!.sub;
    const { deviceToken } = req.body;
    await deviceTokenService.removeToken(deviceToken, consumerId);
    return sendResponse(res, {
      data: { message: "Device token removed." },
    });
  },
);
