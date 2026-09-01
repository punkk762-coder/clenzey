import {
  BadRequestError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import type {
  approvalStatusEnum,
  genderEnum,
  kycStatusEnum,
} from "../../../db/schema/enums.ts";
import { verifyFirebaseIdToken } from "../../../services/firebasePhoneAuthService.ts";
import { resolveUploadUrlForRead } from "../../../services/s3PresignService.ts";
import * as refreshTokenSessions from "../../../services/refreshTokenSessionService.ts";
import { type TokenPayload } from "../../../utilities/authUtils.ts";
import { isAllowedUploadUrl } from "../../../validations/uploadUrlValidator.ts";
import * as partnerRepo from "./repository.ts";

type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];
type Gender = (typeof genderEnum.enumValues)[number];
type KycStatus = (typeof kycStatusEnum.enumValues)[number];

export type PartnerProfile = {
  approvalRejectionReason: null | string;
  approvalStatus: ApprovalStatus;
  avgRating: null | string;
  bio: null | string;
  createdAt: Date | undefined;
  dob: null | string;
  email: null | string;
  experienceYears: null | number;
  fullName: null | string;
  gender: Gender | null;
  id: string;
  isAvailable: boolean;
  kycStatus: KycStatus;
  languages: string[];
  phone: string;
  profileImage: null | string;
  totalReviews: number;
  updatedAt: Date | undefined;
};

const mapPartnerProfile = async (
  user: partnerRepo.PartnerUser,
): Promise<PartnerProfile> => ({
  approvalRejectionReason: user.partner?.approvalRejectionReason ?? null,
  approvalStatus: user.partner?.approvalStatus ?? "PENDING",
  avgRating: user.partner?.avgRating ?? null,
  bio: user.partner?.bio ?? null,
  createdAt: user.partner?.createdAt,
  dob:
    user.partner?.dob instanceof Date
      ? user.partner.dob.toISOString().slice(0, 10)
      : (user.partner?.dob ?? null),
  email: user.email ?? null,
  experienceYears: user.partner?.experienceYears ?? null,
  fullName: user.partner?.fullName ?? null,
  gender: user.partner?.gender ?? null,
  id: user.id,
  isAvailable: user.partner?.isAvailable ?? true,
  kycStatus: user.partner?.kycStatus ?? "PENDING",
  languages: user.partner?.languages ?? [],
  phone: user.phone,
  profileImage: await resolveUploadUrlForRead(user.partner?.profileImage),
  totalReviews: user.partner?.totalReviews ?? 0,
  updatedAt: user.partner?.updatedAt,
});

export const authenticateWithFirebase = async (idToken: string) => {
  const { phone } = await verifyFirebaseIdToken(idToken);
  return phone;
};

export const upsertPartner = async (phone: string, fullName?: string) => {
  const existing = await partnerRepo.findPartnerByPhone(phone);
  if (existing) {
    return { isNewPartner: false, user: existing };
  }

  const user = await partnerRepo.createPartnerForPhone(phone, fullName);
  return { isNewPartner: true, user };
};

export const generateTokenPair = async (user: partnerRepo.PartnerUser) => {
  const payload: TokenPayload = {
    phone: user.phone,
    sub: user.id,
    userType: "PARTNER",
  };

  return refreshTokenSessions.issueTokenPair(payload, "15m", "30d");
};

export const refreshSession = async (payload: TokenPayload) => {
  const user = await partnerRepo.findPartnerById(payload.sub);

  if (!user?.isActive) {
    throw new UnauthorizedError("Account not found or deactivated.");
  }

  const accessToken = await refreshTokenSessions.issueAccessToken(
    { phone: user.phone, sub: user.id, userType: "PARTNER" },
    "15m",
  );

  return { accessToken };
};

export const rotateRefreshSession = async (
  refreshToken: string,
  payload: TokenPayload,
) => {
  const user = await partnerRepo.findPartnerById(payload.sub);

  if (!user?.isActive) {
    throw new UnauthorizedError("Account not found or deactivated.");
  }

  return refreshTokenSessions.rotateRefreshToken(
    refreshToken,
    "PARTNER",
    { phone: user.phone, sub: user.id, userType: "PARTNER" },
    "15m",
    "30d",
  );
};

export const getProfile = async (partnerId: string): Promise<PartnerProfile> => {
  const user = await partnerRepo.findPartnerById(partnerId);
  if (!user) {
    throw new UnauthorizedError("Account not found.");
  }
  return await mapPartnerProfile(user);
};

export const updateProfile = async (
  partnerId: string,
  input: partnerRepo.PartnerProfileUpdate,
): Promise<PartnerProfile> => {
  if (
    input.profileImage !== undefined &&
    input.profileImage !== null &&
    !isAllowedUploadUrl(input.profileImage)
  ) {
    throw new BadRequestError("profileImage must use an allowed upload origin.");
  }

  const user = await partnerRepo.updatePartnerProfile(partnerId, input);
  return await mapPartnerProfile(user);
};
