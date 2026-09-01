import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { deliverConsumerAuthTokens } from "../../../utilities/authUtils.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as authPasswordService from "./authPasswordService.ts";

export const consumerPasswordSignUp: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { email, password, phone, referralCode } = req.body;

    const result = await authPasswordService.consumerSignUp(
      email,
      phone,
      password,
      referralCode,
    );

    const tokens = deliverConsumerAuthTokens(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return sendResponse(res, {
      data: {
        ...tokens,
        user: result.user,
      },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const consumerPasswordSignIn: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { identifier, password } = req.body;

    const result = await authPasswordService.consumerSignIn(
      identifier,
      password,
    );

    const tokens = deliverConsumerAuthTokens(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return sendResponse(res, {
      data: {
        ...tokens,
        user: result.user,
      },
      statusCode: HttpStatusCode.Ok,
    });
  },
);
