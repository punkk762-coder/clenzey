import type { RequestHandler } from "express";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as platformPricingService from "./service.ts";

export const getPlatformPricing: RequestHandler = tryCatchUtil(
  async (_req, res) => {
    const settings = await platformPricingService.getActiveSettings();
    return sendResponse(res, { data: { settings } });
  },
);

export const updatePlatformPricing: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const settings = await platformPricingService.updateSettings(req.body);
    return sendResponse(res, { data: { settings } });
  },
);

export const listPlatformPricingHistory: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const filters = (
      req as unknown as {
        validatedQuery: { limit?: number; offset?: number };
      }
    ).validatedQuery;

    const history = await platformPricingService.listSettingsHistory(filters);
    return sendResponse(res, { data: { history } });
  },
);
