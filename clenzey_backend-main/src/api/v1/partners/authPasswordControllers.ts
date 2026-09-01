import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { deliverPartnerAuthTokens } from "../../../utilities/authUtils.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as authService from "./authPasswordService.ts";

export const partnerPasswordSignUp: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { email, phone, password, fullName } = req.body;

    const result = await authService.partnerSignUp(
      email,
      phone,
      password,
      fullName,
    );

    const tokens = deliverPartnerAuthTokens(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return sendResponse(res, {
      data: {
        ...tokens,
        approvalStatus: result.approvalStatus,
        user: result.user,
      },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const partnerPasswordSignIn: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { identifier, password } = req.body;

    const result = await authService.partnerSignIn(identifier, password);

    const tokens = deliverPartnerAuthTokens(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return sendResponse(res, {
      data: {
        ...tokens,
        approvalStatus: result.approvalStatus,
        user: result.user,
      },
      statusCode: HttpStatusCode.Ok,
    });
  },
);
