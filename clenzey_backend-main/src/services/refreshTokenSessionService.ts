import { randomUUID } from "node:crypto";

import { SignJWT } from "jose";

import { envConfig } from "../configs/environmentConfig.ts";
import { getRedisClient, isRedisConfigured } from "../configs/redisConfig.ts";
import { UnauthorizedError } from "../errors/appErrors.ts";
import {
  generateToken,
  type TokenPayload,
  verifyToken,
} from "../utilities/authUtils.ts";

const jwtSecret = new TextEncoder().encode(envConfig.JWT_SECRET);

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_VER_PREFIX = "auth:sv:";
const REFRESH_JTI_PREFIX = "auth:rft:";

type AuthUserType = "ADMIN" | "CONSUMER" | "PARTNER";

type RefreshPayload = TokenPayload & {
  jti: string;
  sv: number;
};

const memoryJtis = new Map<string, number>();
const memorySessionVersions = new Map<string, number>();

const sessionKey = (userType: AuthUserType, userId: string): string =>
  `${userType}:${userId}`;

const getSessionVersion = async (
  userType: AuthUserType,
  userId: string,
): Promise<number> => {
  const key = SESSION_VER_PREFIX + sessionKey(userType, userId);
  const redis = getRedisClient();

  if (redis) {
    const value = await redis.get(key);
    return value ? Number.parseInt(value, 10) : 1;
  }

  return memorySessionVersions.get(sessionKey(userType, userId)) ?? 1;
};

const registerJti = async (jti: string): Promise<void> => {
  const redis = getRedisClient();
  const key = REFRESH_JTI_PREFIX + jti;

  if (redis) {
    await redis.setex(key, REFRESH_TTL_SECONDS, "1");
    return;
  }

  memoryJtis.set(jti, Date.now() + REFRESH_TTL_SECONDS * 1000);
};

const isJtiActive = async (jti: string): Promise<boolean> => {
  const redis = getRedisClient();
  const key = REFRESH_JTI_PREFIX + jti;

  if (redis) {
    return (await redis.exists(key)) === 1;
  }

  const expiresAt = memoryJtis.get(jti);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    memoryJtis.delete(jti);
    return false;
  }

  return true;
};

export const revokeJti = async (jti: string): Promise<void> => {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(REFRESH_JTI_PREFIX + jti);
    return;
  }

  memoryJtis.delete(jti);
};

export const revokeAllSessions = async (
  userType: AuthUserType,
  userId: string,
): Promise<void> => {
  const redis = getRedisClient();
  const key = SESSION_VER_PREFIX + sessionKey(userType, userId);

  if (redis) {
    await redis.incr(key);
    return;
  }

  const current = memorySessionVersions.get(sessionKey(userType, userId)) ?? 1;
  memorySessionVersions.set(sessionKey(userType, userId), current + 1);
};

export const issueRefreshToken = async (
  payload: TokenPayload,
  expiresIn: number | string = "30d",
): Promise<string> => {
  const userType = payload.userType as AuthUserType;
  const jti = randomUUID();
  const sv = await getSessionVersion(userType, payload.sub);
  const { phone, role, sub, userType: type } = payload;

  const token = await new SignJWT({
    phone,
    sv,
    userType: type,
    ...(role !== undefined && { role }),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(expiresIn)
    .sign(jwtSecret);

  await registerJti(jti);
  return token;
};

export const issueAccessToken = async (
  payload: TokenPayload,
  expiresIn: number | string,
): Promise<string> => generateToken(payload, expiresIn);

export const issueTokenPair = async (
  payload: TokenPayload,
  accessExpiresIn: number | string,
  refreshExpiresIn: number | string = "30d",
): Promise<{ accessToken: string; refreshToken: string }> => {
  const [accessToken, refreshToken] = await Promise.all([
    issueAccessToken(payload, accessExpiresIn),
    issueRefreshToken(payload, refreshExpiresIn),
  ]);

  return { accessToken, refreshToken };
};

export const assertRefreshTokenValid = async (
  refreshToken: string,
  expectedUserType: AuthUserType,
): Promise<RefreshPayload> => {
  let payload: TokenPayload;
  try {
    payload = await verifyToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid session.");
  }

  if (payload.userType !== expectedUserType) {
    throw new UnauthorizedError("Access denied.");
  }

  const jti = typeof payload.jti === "string" ? payload.jti : null;
  const sv = typeof payload.sv === "number" ? payload.sv : null;

  if (!jti || sv === null) {
    throw new UnauthorizedError("Session expired, please log in again.");
  }

  const currentVersion = await getSessionVersion(expectedUserType, payload.sub);
  if (sv !== currentVersion) {
    throw new UnauthorizedError("Session expired, please log in again.");
  }

  if (!(await isJtiActive(jti))) {
    throw new UnauthorizedError("Session expired, please log in again.");
  }

  return { ...payload, jti, sv };
};

export const rotateRefreshToken = async (
  refreshToken: string,
  expectedUserType: AuthUserType,
  nextPayload: TokenPayload,
  accessExpiresIn: number | string,
  refreshExpiresIn: number | string = "30d",
): Promise<{ accessToken: string; refreshToken: string }> => {
  const current = await assertRefreshTokenValid(refreshToken, expectedUserType);
  await revokeJti(current.jti);

  return issueTokenPair(nextPayload, accessExpiresIn, refreshExpiresIn);
};

export const revokeRefreshTokenString = async (
  refreshToken: string | null,
): Promise<void> => {
  if (!refreshToken) return;

  try {
    const payload = await verifyToken(refreshToken);
    const jti = typeof payload.jti === "string" ? payload.jti : null;
    if (jti) {
      await revokeJti(jti);
    }
  } catch {
    // Ignore invalid tokens during logout.
  }
};

/** Used in tests to reset in-memory fallback state. */
export const resetRefreshTokenSessionStoreForTests = (): void => {
  if (isRedisConfigured()) return;
  memoryJtis.clear();
  memorySessionVersions.clear();
};
