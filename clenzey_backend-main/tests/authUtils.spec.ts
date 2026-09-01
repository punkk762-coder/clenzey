import { describe, expect, it } from "vitest";

import {
  clearRefreshTokenCookie,
  CONSUMER_REFRESH_TOKEN_COOKIE,
  PARTNER_REFRESH_TOKEN_COOKIE,
  deliverConsumerAuthTokens,
  deliverPartnerAuthTokens,
  generateToken,
  setRefreshTokenCookie,
  verifyToken,
} from "../src/utilities/authUtils.ts";
import { mockRequest, mockResponse } from "./helpers/mockExpress.ts";

const basePayload = {
  phone: "+919876543210",
  sub: "user-1",
  userType: "CONSUMER",
};

describe("generateToken / verifyToken", () => {
  it("produces a token that round-trips through verification", async () => {
    const token = await generateToken(basePayload);
    const payload = await verifyToken(token);

    expect(payload.sub).toBe("user-1");
    expect(payload.phone).toBe("+919876543210");
    expect(payload.userType).toBe("CONSUMER");
  });

  it("includes the role claim when provided", async () => {
    const token = await generateToken({
      ...basePayload,
      role: "SUPPORT",
      userType: "ADMIN",
    });
    const payload = await verifyToken(token);

    expect(payload.role).toBe("SUPPORT");
    expect(payload.userType).toBe("ADMIN");
  });

  it("omits the role claim when not provided", async () => {
    const token = await generateToken(basePayload);
    const payload = await verifyToken(token);

    expect(payload.role).toBeUndefined();
  });

  it("rejects a tampered token", async () => {
    const token = await generateToken(basePayload);
    await expect(verifyToken(`${token}tampered`)).rejects.toThrow();
  });

  it("respects a custom expiration time", async () => {
    const token = await generateToken(basePayload, "1h");
    const payload = await verifyToken(token);

    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.exp! - payload.iat!).toBe(60 * 60);
  });
});

describe("setRefreshTokenCookie", () => {
  it("sets an httpOnly cookie with the expected options", () => {
    const res = mockResponse();

    setRefreshTokenCookie(res, "refresh-token-value", CONSUMER_REFRESH_TOKEN_COOKIE);

    expect(res.cookie).toHaveBeenCalledWith(
      CONSUMER_REFRESH_TOKEN_COOKIE,
      "refresh-token-value",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
        sameSite: "strict",
        secure: false,
      }),
    );
  });
});

describe("clearRefreshTokenCookie", () => {
  it("clears the refresh token cookie with matching options", () => {
    const res = mockResponse();

    clearRefreshTokenCookie(res, PARTNER_REFRESH_TOKEN_COOKIE);

    expect(res.clearCookie).toHaveBeenCalledWith(
      PARTNER_REFRESH_TOKEN_COOKIE,
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        secure: false,
      }),
    );
  });
});

describe("deliverConsumerAuthTokens", () => {
  const tokens = { accessToken: "access", refreshToken: "refresh" };

  it("returns the refresh token in the body for mobile clients", () => {
    const req = mockRequest({ headers: { "x-client-platform": "ios" } });
    const res = mockResponse();

    const result = deliverConsumerAuthTokens(req, res, tokens);

    expect(result).toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("sets the refresh token cookie for web clients", () => {
    const req = mockRequest();
    const res = mockResponse();

    const result = deliverConsumerAuthTokens(req, res, tokens);

    expect(result).toEqual({ accessToken: "access" });
    expect(res.cookie).toHaveBeenCalledWith(
      CONSUMER_REFRESH_TOKEN_COOKIE,
      "refresh",
      expect.any(Object),
    );
  });
});

describe("deliverPartnerAuthTokens", () => {
  const tokens = { accessToken: "access", refreshToken: "refresh" };

  it("returns the refresh token in the body for mobile clients", () => {
    const req = mockRequest({ headers: { "x-client-platform": "android" } });
    const res = mockResponse();

    const result = deliverPartnerAuthTokens(req, res, tokens);

    expect(result).toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("sets the partner refresh token cookie for web clients", () => {
    const req = mockRequest();
    const res = mockResponse();

    const result = deliverPartnerAuthTokens(req, res, tokens);

    expect(result).toEqual({ accessToken: "access" });
    expect(res.cookie).toHaveBeenCalledWith(
      PARTNER_REFRESH_TOKEN_COOKIE,
      "refresh",
      expect.any(Object),
    );
  });
});
