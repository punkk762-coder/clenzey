import type { Request } from "express";
import { describe, expect, it } from "vitest";

import {
  getRefreshTokenFromRequest,
  isMobileClient,
} from "../src/utilities/authUtils.ts";

const mockRequest = (input: {
  body?: Record<string, unknown>;
  cookie?: string;
  platform?: string;
}): Request =>
  ({
    body: input.body ?? {},
    cookies: input.cookie ? { rft_partner: input.cookie } : {},
    headers: input.platform ? { "x-client-platform": input.platform } : {},
  }) as Request;

describe("isMobileClient", () => {
  it("detects ios, android, and mobile platforms", () => {
    expect(isMobileClient(mockRequest({ platform: "ios" }))).toBe(true);
    expect(isMobileClient(mockRequest({ platform: "ANDROID" }))).toBe(true);
    expect(isMobileClient(mockRequest({ platform: " mobile " }))).toBe(true);
  });

  it("returns false for web clients", () => {
    expect(isMobileClient(mockRequest({ platform: "web" }))).toBe(false);
    expect(isMobileClient(mockRequest({}))).toBe(false);
  });
});

describe("getRefreshTokenFromRequest", () => {
  it("prefers the HttpOnly cookie for web clients", () => {
    const token = getRefreshTokenFromRequest(
      mockRequest({
        body: { refreshToken: "body-token" },
        cookie: "cookie-token",
      }),
      "rft_partner",
    );
    expect(token).toBe("cookie-token");
  });

  it("prefers the JSON body refresh token for mobile clients", () => {
    const token = getRefreshTokenFromRequest(
      mockRequest({
        body: { refreshToken: "body-token" },
        cookie: "cookie-token",
        platform: "ios",
      }),
      "rft_partner",
    );
    expect(token).toBe("body-token");
  });

  it("falls back to the JSON body refresh token for web clients", () => {
    const token = getRefreshTokenFromRequest(
      mockRequest({ body: { refreshToken: "body-token" } }),
      "rft_partner",
    );
    expect(token).toBe("body-token");
  });

  it("returns null when no refresh token is supplied", () => {
    const token = getRefreshTokenFromRequest(mockRequest({}), "rft_partner");
    expect(token).toBeNull();
  });
});
