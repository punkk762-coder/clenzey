import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import ErrorMsg from "../../../errors/errorMsg.ts";
import {
  CONSUMER_REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  deliverConsumerAuthTokens,
  getRefreshTokenFromRequest,
  isMobileClient,
} from "../../../utilities/authUtils.ts";
import * as refreshTokenSessions from "../../../services/refreshTokenSessionService.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as referralsService from "../referrals/service.ts";
import * as consumerRepo from "./repository.ts";
import * as consumerService from "./service.ts";
import { resolveUploadUrlForRead } from "../../../services/s3PresignService.ts";

export const consumerAuthFirebase: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { idToken, referralCode } = req.body;

    const phone = await consumerService.authenticateWithFirebase(idToken);
    const { isNewUser, user } = await consumerService.upsertConsumer(phone);

    if (isNewUser && referralCode) {
      await referralsService.applyReferralCode(user.id, referralCode);
    }

    const { accessToken, refreshToken } =
      await consumerService.generateTokenPair(user);

    const tokens = deliverConsumerAuthTokens(req, res, {
      accessToken,
      refreshToken,
    });

    return sendResponse(res, {
      data: {
        ...tokens,
        isNewUser,
        user: {
          fullName: user.consumer?.fullName ?? null,
          id: user.id,
          phone: user.phone,
          profileImage: await resolveUploadUrlForRead(
            user.consumer?.profileImage,
          ),
          referralCode: user.consumer?.referralCode ?? null,
        },
      },
      statusCode: isNewUser ? HttpStatusCode.Created : HttpStatusCode.Ok,
    });
  },
);

export const consumerAuthRefresh: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(
      req,
      CONSUMER_REFRESH_TOKEN_COOKIE,
    );
    if (!refreshToken) {
      throw new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    let payload;
    try {
      payload = await refreshTokenSessions.assertRefreshTokenValid(
        refreshToken,
        "CONSUMER",
      );
    } catch (err) {
      clearRefreshTokenCookie(res, CONSUMER_REFRESH_TOKEN_COOKIE);
      throw err instanceof UnauthorizedError
        ? err
        : new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    if (isMobileClient(req)) {
      const { accessToken, refreshToken: nextRefreshToken } =
        await consumerService.rotateRefreshSession(refreshToken, payload);
      return sendResponse(res, {
        data: { accessToken, refreshToken: nextRefreshToken },
      });
    }

    const { accessToken } = await consumerService.refreshSession(payload);

    return sendResponse(res, { data: { accessToken } });
  },
);

export const consumerAuthLogout: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(
      req,
      CONSUMER_REFRESH_TOKEN_COOKIE,
    );
    await refreshTokenSessions.revokeRefreshTokenString(refreshToken);
    clearRefreshTokenCookie(res, CONSUMER_REFRESH_TOKEN_COOKIE);
    return sendResponse(res, { message: "Logged out successfully." });
  },
);

export const getConsumer: RequestHandler = tryCatchUtil(async (req, res) => {
  const profile = await consumerService.getProfile(req.user!.sub);
  return sendResponse(res, { data: { consumer: profile } });
});

export const updateConsumer: RequestHandler = tryCatchUtil(async (req, res) => {
  const profile = await consumerService.updateProfile(
    req.user!.sub,
    req.body as consumerRepo.ConsumerProfileUpdate,
  );
  return sendResponse(res, { data: { consumer: profile } });
});
export const deleteConsumer: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user!.sub;
  await consumerService.deleteAccount(userId);
  clearRefreshTokenCookie(res, CONSUMER_REFRESH_TOKEN_COOKIE);
  return sendResponse(res, { message: "Account deleted successfully." });
});
