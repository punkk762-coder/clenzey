import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as referralsService from "./service.ts";

export const getReferralMe: RequestHandler = tryCatchUtil(async (req, res) => {
  const data = await referralsService.getReferralMe(req.user!.sub);
  return sendResponse(res, { data });
});

export const applyReferralCode: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { referralCode } = req.body as { referralCode: string };
    const data = await referralsService.applyReferralCode(
      req.user!.sub,
      referralCode,
    );
    return sendResponse(res, {
      data,
      statusCode: HttpStatusCode.Created,
    });
  },
);
