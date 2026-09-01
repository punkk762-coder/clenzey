import { type UserType } from "../../../db/schema.ts";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { verifyFirebaseIdToken } from "../../../services/firebasePhoneAuthService.ts";
import { resolveUploadUrlForRead } from "../../../services/s3PresignService.ts";
import * as refreshTokenSessions from "../../../services/refreshTokenSessionService.ts";
import { type TokenPayload } from "../../../utilities/authUtils.ts";
import { generateReferralCode } from "../../../utilities/commonUtils.ts";
import { isAllowedUploadUrl } from "../../../validations/uploadUrlValidator.ts";
import * as consumerRepo from "./repository.ts";

const CONSUMER_USER_TYPE: UserType = "CONSUMER";

export const authenticateWithFirebase = async (idToken: string) => {
  const { phone } = await verifyFirebaseIdToken(idToken);
  return phone;
};

export const upsertConsumer = async (phone: string) => {
  let isNewUser = false;
  let user = await consumerRepo.findUserByPhone(phone);

  if (!user) {
    isNewUser = true;
    user = await consumerRepo.createUserWithConsumer(
      phone,
      generateReferralCode(),
    );
  } else if (!user.consumer) {
    // User row exists (e.g., from a partner signup with the same phone, or a
    // stale row left from a previous failed transaction) but no consumer row.
    // Back-fill so the consumers table stays in sync with /consumers/auth/*.
    isNewUser = true;
    user = await consumerRepo.createConsumerForUser(
      user.id,
      generateReferralCode(),
    );
  }

  return { isNewUser, user };
};

export const generateTokenPair = async (user: consumerRepo.ConsumerUser) => {
  const payload: TokenPayload = {
    phone: user.phone,
    sub: user.id,
    userType: CONSUMER_USER_TYPE,
  };

  return refreshTokenSessions.issueTokenPair(payload, "15m", "30d");
};

export const getProfile = async (userId: string) => {
  const user = await consumerRepo.findUserById(userId);
  if (!user) throw new UnauthorizedError("Account not found.");
  return {
    fullName: user.consumer?.fullName ?? null,
    id: user.id,
    phone: user.phone,
    profileImage: await resolveUploadUrlForRead(user.consumer?.profileImage),
    referralCode: user.consumer?.referralCode ?? null,
  };
};

export const updateProfile = async (
  userId: string,
  input: consumerRepo.ConsumerProfileUpdate,
) => {
  if (
    input.profileImage !== undefined &&
    input.profileImage !== null &&
    !isAllowedUploadUrl(input.profileImage)
  ) {
    throw new BadRequestError("profileImage must use an allowed upload origin.");
  }

  await consumerRepo.updateConsumerProfile(userId, input);
  return getProfile(userId);
};

export const refreshSession = async (payload: TokenPayload) => {
  const user = await consumerRepo.findUserById(payload.sub);

  if (!user?.isActive) {
    throw new UnauthorizedError("Account not found or deactivated.");
  }

  const accessToken = await refreshTokenSessions.issueAccessToken(
    { phone: user.phone, sub: user.id, userType: "CONSUMER" },
    "15m",
  );

  return { accessToken };
};

export const rotateRefreshSession = async (
  refreshToken: string,
  payload: TokenPayload,
) => {
  const user = await consumerRepo.findUserById(payload.sub);

  if (!user?.isActive) {
    throw new UnauthorizedError("Account not found or deactivated.");
  }

  return refreshTokenSessions.rotateRefreshToken(
    refreshToken,
    "CONSUMER",
    { phone: user.phone, sub: user.id, userType: "CONSUMER" },
    "15m",
    "30d",
  );
};

const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
] as const;

export const deleteAccount = async (userId: string): Promise<void> => {
  const user = await consumerRepo.findUserById(userId);
  if (!user?.isActive) {
    throw new UnauthorizedError("Account not found or deactivated.");
  }

  const activeBookings = await consumerRepo.countActiveBookings(userId);
  if (activeBookings > 0) {
    throw new ConflictError(
      "Cannot delete account while you have active bookings. Cancel or complete them first.",
    );
  }

  await consumerRepo.deactivateAccount(userId);
  await refreshTokenSessions.revokeAllSessions("CONSUMER", userId);
};
