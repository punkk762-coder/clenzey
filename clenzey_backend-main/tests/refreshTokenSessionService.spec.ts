import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  assertRefreshTokenValid,
  issueTokenPair,
  resetRefreshTokenSessionStoreForTests,
  revokeAllSessions,
  revokeRefreshTokenString,
  rotateRefreshToken,
} from "../src/services/refreshTokenSessionService.ts";
import * as redisConfig from "../src/configs/redisConfig.ts";
import { generateToken } from "../src/utilities/authUtils.ts";

describe("refreshTokenSessionService", () => {
  beforeEach(() => {
    resetRefreshTokenSessionStoreForTests();
  });

  it("issues refresh tokens that validate for the expected user type", async () => {
    const { refreshToken } = await issueTokenPair(
      { phone: "+919999999999", sub: "user-1", userType: "CONSUMER" },
      "15m",
      "30d",
    );

    const payload = await assertRefreshTokenValid(refreshToken, "CONSUMER");
    expect(payload.sub).toBe("user-1");
  });

  it("rotates refresh tokens and invalidates the previous jti", async () => {
    const initial = await issueTokenPair(
      { phone: "+919999999999", sub: "user-2", userType: "PARTNER" },
      "15m",
      "30d",
    );

    const rotated = await rotateRefreshToken(
      initial.refreshToken,
      "PARTNER",
      { phone: "+919999999999", sub: "user-2", userType: "PARTNER" },
      "15m",
      "30d",
    );

    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    await expect(
      assertRefreshTokenValid(initial.refreshToken, "PARTNER"),
    ).rejects.toThrow("Session expired");
  });

  it("revokes all sessions by bumping the session version", async () => {
    const { refreshToken } = await issueTokenPair(
      { phone: "+919999999999", sub: "user-3", userType: "ADMIN", role: "SUPPORT" },
      "1h",
      "30d",
    );

    await revokeAllSessions("ADMIN", "user-3");

    await expect(assertRefreshTokenValid(refreshToken, "ADMIN")).rejects.toThrow(
      "Session expired",
    );
  });

  it("revokes a refresh token on logout", async () => {
    const { refreshToken } = await issueTokenPair(
      { phone: "+919999999999", sub: "user-4", userType: "CONSUMER" },
      "15m",
      "30d",
    );

    await revokeRefreshTokenString(refreshToken);

    await expect(
      assertRefreshTokenValid(refreshToken, "CONSUMER"),
    ).rejects.toThrow("Session expired");
  });

  it("rejects refresh tokens with wrong userType", async () => {
    const { refreshToken } = await issueTokenPair(
      { phone: "+919999999999", sub: "user-5", userType: "CONSUMER" },
      "15m",
      "30d",
    );

    await expect(
      assertRefreshTokenValid(refreshToken, "PARTNER"),
    ).rejects.toThrow("Access denied.");
  });

  it("rejects invalid refresh tokens", async () => {
    await expect(
      assertRefreshTokenValid("not-a-valid-token", "CONSUMER"),
    ).rejects.toThrow("Invalid session.");
  });

  it("rejects access tokens missing jti and sv claims", async () => {
    const accessOnlyToken = await generateToken({
      phone: "+919999999999",
      sub: "user-6",
      userType: "CONSUMER",
    });

    await expect(
      assertRefreshTokenValid(accessOnlyToken, "CONSUMER"),
    ).rejects.toThrow("Session expired, please log in again.");
  });

  it("ignores null refresh tokens on logout", async () => {
    await expect(revokeRefreshTokenString(null)).resolves.toBeUndefined();
  });

  it("ignores invalid refresh tokens on logout", async () => {
    await expect(revokeRefreshTokenString("not-a-token")).resolves.toBeUndefined();
  });

  it("uses redis-backed session storage when a client is available", async () => {
    const redis = {
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue("1"),
      incr: vi.fn().mockResolvedValue(2),
      setex: vi.fn().mockResolvedValue("OK"),
    };
    vi.spyOn(redisConfig, "getRedisClient").mockReturnValue(redis as never);
    vi.spyOn(redisConfig, "isRedisConfigured").mockReturnValue(true);

    const { refreshToken } = await issueTokenPair(
      { phone: "+919999999999", sub: "user-7", userType: "CONSUMER" },
      "15m",
      "30d",
    );

    const payload = await assertRefreshTokenValid(refreshToken, "CONSUMER");
    expect(payload.sub).toBe("user-7");
    expect(redis.setex).toHaveBeenCalled();
    expect(redis.exists).toHaveBeenCalled();

    await revokeAllSessions("CONSUMER", "user-7");
    expect(redis.incr).toHaveBeenCalled();

    await revokeRefreshTokenString(refreshToken);
    expect(redis.del).toHaveBeenCalled();
  });
});
