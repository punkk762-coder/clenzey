import type { Request, Response } from "express";

import { type JWTPayload, jwtVerify, SignJWT } from "jose";

import { envConfig } from "../configs/environmentConfig.ts";

const jwtSecret = new TextEncoder().encode(envConfig.JWT_SECRET);
export const ADMIN_REFRESH_TOKEN_COOKIE = "rft_admin";
export const CONSUMER_REFRESH_TOKEN_COOKIE = "rft_consumer";
export const PARTNER_REFRESH_TOKEN_COOKIE = "rft_partner";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type TokenPayload = JWTPayload & {
  phone: string;
  role?: string;
  sub: string;
  userType: string;
};

export const generateToken = async (
  payload: TokenPayload,
  expiresIn: number | string = "24h",
) => {
  const { phone, role, sub, userType } = payload;

  return await new SignJWT({
    phone,
    userType,
    ...(role !== undefined && { role }),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(jwtSecret);
};

export const verifyToken = async (token: string) => {
  const { payload } = await jwtVerify(token, jwtSecret);
  return payload as TokenPayload;
};

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
  cookieName: string,
) => {
  res.cookie(cookieName, refreshToken, {
    httpOnly: true,
    maxAge: THIRTY_DAYS_MS,
    path: "/",
    sameSite: "strict",
    secure: envConfig.NODE_ENV === "prod",
  });
};

export const clearRefreshTokenCookie = (res: Response, cookieName: string) => {
  res.clearCookie(cookieName, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: envConfig.NODE_ENV === "prod",
  });
};

export const getRefreshTokenFromCookie = (req: Request, cookieName: string) => {
  return req.cookies?.[cookieName] ?? null;
};

const MOBILE_CLIENT_PLATFORMS = new Set(["android", "ios", "mobile"]);

/** Native apps send `X-Client-Platform: ios|android|mobile` to receive refresh tokens in JSON. */
export const isMobileClient = (req: Request): boolean => {
  const platform = req.headers["x-client-platform"];
  if (typeof platform !== "string") return false;
  return MOBILE_CLIENT_PLATFORMS.has(platform.trim().toLowerCase());
};

const getRefreshTokenFromBody = (req: Request): null | string => {
  const body = req.body as { refreshToken?: unknown } | undefined;
  if (typeof body?.refreshToken === "string" && body.refreshToken.length > 0) {
    return body.refreshToken;
  }

  return null;
};

export const getRefreshTokenFromRequest = (
  req: Request,
  cookieName: string,
): null | string => {
  const fromBody = getRefreshTokenFromBody(req);

  // Native apps persist refresh tokens in secure storage and send them in JSON.
  // Prefer the body token so a stale browser/WebView cookie cannot shadow it.
  if (isMobileClient(req)) {
    return fromBody ?? getRefreshTokenFromCookie(req, cookieName);
  }

  return getRefreshTokenFromCookie(req, cookieName) ?? fromBody;
};

const deliverAuthTokens = (
  req: Request,
  res: Response,
  cookieName: string,
  tokens: { accessToken: string; refreshToken: string },
): { accessToken: string; refreshToken?: string } => {
  if (isMobileClient(req)) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  setRefreshTokenCookie(res, tokens.refreshToken, cookieName);
  return { accessToken: tokens.accessToken };
};

export const deliverConsumerAuthTokens = (
  req: Request,
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): { accessToken: string; refreshToken?: string } => {
  return deliverAuthTokens(req, res, CONSUMER_REFRESH_TOKEN_COOKIE, tokens);
};

export const deliverPartnerAuthTokens = (
  req: Request,
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): { accessToken: string; refreshToken?: string } => {
  return deliverAuthTokens(req, res, PARTNER_REFRESH_TOKEN_COOKIE, tokens);
};
