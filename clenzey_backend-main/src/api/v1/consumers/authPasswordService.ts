import { ConflictError, UnauthorizedError } from "../../../errors/appErrors.ts";
import { generateReferralCode } from "../../../utilities/commonUtils.ts";
import {
  hashPassword,
  verifyPassword,
} from "../../../utilities/passwordUtils.ts";
import * as referralsService from "../referrals/service.ts";
import { resolveUploadUrlForRead } from "../../../services/s3PresignService.ts";
import * as consumerRepo from "./repository.ts";
import * as consumerService from "./service.ts";

function resolveIdentifierType(identifier: string): "email" | "phone" | null {
  if (identifier.includes("@")) return "email";
  if (identifier.startsWith("+")) return "phone";
  return null;
}

async function generateTokenPair(user: consumerRepo.ConsumerUser) {
  return consumerService.generateTokenPair(user);
}

export const consumerSignUp = async (
  email: string,
  phone: string,
  password: string,
  referralCode?: string,
) => {
  // Check email uniqueness
  const existingByEmail = await consumerRepo.findUserByEmail(email);
  if (existingByEmail) {
    throw new ConflictError("Email is already registered");
  }

  // Check phone uniqueness
  const existingByPhone = await consumerRepo.findUserByPhone(phone);
  if (existingByPhone) {
    throw new ConflictError("Phone number is already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user + consumer in transaction
  const ownReferralCode = generateReferralCode();
  const user = await consumerRepo.createUserWithConsumerAndPassword(
    email,
    phone,
    passwordHash,
    ownReferralCode,
  );

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  if (referralCode) {
    await referralsService.applyReferralCode(user.id, referralCode);
  }

  return {
    accessToken,
    refreshToken,
    user: {
      email: user.email,
      fullName: user.consumer?.fullName ?? null,
      id: user.id,
      phone: user.phone,
      profileImage: await resolveUploadUrlForRead(user.consumer?.profileImage),
      referralCode: user.consumer?.referralCode ?? null,
    },
  };
};

export const consumerSignIn = async (
  identifier: string,
  password: string,
) => {
  const genericError = "Invalid credentials";

  // Resolve identifier type
  const identifierType = resolveIdentifierType(identifier);

  // Find user by identifier
  let user: consumerRepo.ConsumerUser | null = null;

  if (identifierType === "email") {
    user = await consumerRepo.findUserByEmail(identifier);
  } else if (identifierType === "phone") {
    user = await consumerRepo.findUserByPhone(identifier);
  } else {
    // Invalid identifier format — still return generic error for anti-enumeration
    throw new UnauthorizedError(genericError);
  }

  // User not found
  if (!user) {
    throw new UnauthorizedError(genericError);
  }

  // User has no password set (OTP-only user)
  if (!user.passwordHash) {
    throw new UnauthorizedError(genericError);
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError(genericError);
  }

  // Check consumer role record exists
  if (!user.consumer) {
    throw new UnauthorizedError(genericError);
  }

  // Check isActive
  if (!user.isActive) {
    throw new UnauthorizedError(genericError);
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  return {
    accessToken,
    refreshToken,
    user: {
      email: user.email,
      fullName: user.consumer.fullName ?? null,
      id: user.id,
      phone: user.phone,
      profileImage: await resolveUploadUrlForRead(user.consumer.profileImage),
    },
  };
};
