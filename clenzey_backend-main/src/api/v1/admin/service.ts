import { scrypt, timingSafeEqual } from "node:crypto";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import * as refreshTokenSessions from "../../../services/refreshTokenSessionService.ts";
import { type TokenPayload } from "../../../utilities/authUtils.ts";
import * as adminRepo from "./repository.ts";

/**
 * Verifies a plaintext password against a stored "salt:hash" string.
 */
async function verifyPassword(
  plaintext: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(plaintext, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  const hashBuffer = Buffer.from(hash, "hex");
  return timingSafeEqual(derivedKey, hashBuffer);
}

export const login = async (username: string, password: string) => {
  const adminUser = await adminRepo.findAdminByUsername(username);
  if (!adminUser) {
    throw new UnauthorizedError("Invalid username or password.");
  }

  const isValid = await verifyPassword(password, adminUser.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError("Invalid username or password.");
  }

  return adminUser;
};

export const generateTokenPair = async (admin: adminRepo.AdminUser) => {
  const payload: TokenPayload = {
    phone: admin.phone,
    role: admin.role,
    sub: admin.id,
    userType: "ADMIN",
  };

  return refreshTokenSessions.issueTokenPair(payload, "1h", "30d");
};

export const refreshSession = async (
  refreshToken: string,
  payload: TokenPayload,
) => {
  const admin = await adminRepo.findAdminById(payload.sub);

  if (!admin?.isActive) {
    throw new UnauthorizedError("Account not found or deactivated.");
  }

  return refreshTokenSessions.rotateRefreshToken(
    refreshToken,
    "ADMIN",
    {
      phone: admin.phone,
      role: admin.role,
      sub: admin.id,
      userType: "ADMIN",
    },
    "1h",
    "30d",
  );
};
