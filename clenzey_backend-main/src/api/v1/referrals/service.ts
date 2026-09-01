import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import {
  buildReferralShareMessage,
  referralConfig,
} from "../../../configs/referralConfig.ts";
import * as notificationsService from "../notifications/service.ts";
import * as repo from "./repository.ts";

export type ReferralRewardView = {
  couponCode: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderAmount: number;
  redeemed: boolean;
  role: "REFEREE" | "REFERRER";
  validUntil: null | string;
};

export type ReferralMadeView = {
  appliedAt: string;
  refereeRewardIssued: boolean;
};

export type ReferralMeResponse = {
  appliedReferral: {
    appliedAt: string;
    referralCode: string;
  } | null;
  hasAppliedReferral: boolean;
  referralCode: string;
  rewards: {
    received: ReferralRewardView[];
    referralsMade: ReferralMadeView[];
  };
  shareMessage: string;
};

const mapCouponToReward = async (
  coupon: repo.CouponRecord,
  consumerId: string,
): Promise<ReferralRewardView> => {
  const role =
    (await repo.findReferralRoleForCoupon(consumerId, coupon.id)) ?? "REFEREE";

  return {
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: parseFloat(coupon.discountValue),
    minOrderAmount: parseFloat(coupon.minOrderAmount),
    redeemed: await repo.isCouponRedeemed(coupon.id),
    role,
    validUntil: coupon.validUntil?.toISOString() ?? null,
  };
};

export const getReferralMe = async (
  consumerId: string,
): Promise<ReferralMeResponse> => {
  const consumer = await repo.findConsumerById(consumerId);
  if (!consumer) {
    throw new NotFoundError("Consumer not found.");
  }

  const inboundReferral = await repo.findReferralByRefereeId(consumerId);
  const issuedCoupons = await repo.listIssuedCouponsForConsumer(consumerId);
  const referralsMade = await repo.listReferralsByReferrerId(consumerId);

  const received = await Promise.all(
    issuedCoupons.map((coupon) => mapCouponToReward(coupon, consumerId)),
  );

  return {
    appliedReferral: inboundReferral
      ? {
          appliedAt: inboundReferral.appliedAt.toISOString(),
          referralCode: inboundReferral.referralCode,
        }
      : null,
    hasAppliedReferral: !!consumer.referrerId,
    referralCode: consumer.referralCode,
    rewards: {
      received,
      referralsMade: referralsMade.map((referral) => ({
        appliedAt: referral.appliedAt.toISOString(),
        refereeRewardIssued: !!referral.refereeCouponId,
      })),
    },
    shareMessage: buildReferralShareMessage(consumer.referralCode),
  };
};

export type ApplyReferralCodeResult = {
  referral: {
    appliedAt: string;
    referrerId: string;
  };
  referrerNotified: boolean;
  yourReward: {
    couponCode: string;
    discountValue: number;
    minOrderAmount: number;
    validUntil: null | string;
  };
};

export const applyReferralCode = async (
  refereeId: string,
  referralCode: string,
): Promise<ApplyReferralCodeResult> => {
  const normalizedCode = referralCode.trim().toUpperCase();
  if (!normalizedCode) {
    throw new BadRequestError("Referral code is required.");
  }

  const referee = await repo.findConsumerById(refereeId);
  if (!referee) {
    throw new NotFoundError("Consumer not found.");
  }

  if (referee.referrerId) {
    throw new ConflictError("Referral code already applied.");
  }

  if (referee.referralCode.toUpperCase() === normalizedCode) {
    throw new BadRequestError("Cannot use your own referral code.");
  }

  const referrer = await repo.findConsumerByReferralCode(normalizedCode);
  if (!referrer || !referrer.isActive) {
    throw new BadRequestError("Invalid referral code.");
  }

  if (referrer.id === refereeId) {
    throw new BadRequestError("Cannot use your own referral code.");
  }

  if (referrer.referrerId === refereeId) {
    throw new BadRequestError("Invalid referral code.");
  }

  const result = await repo.applyReferralTransaction(
    {
      refereeId,
      referralCode: normalizedCode,
      referrerId: referrer.id,
    },
    referralConfig.referee,
    referralConfig.referrer,
  );

  let referrerNotified = false;
  try {
    await notificationsService.createNotification({
      body: `Your friend joined Clenzey using your code. You earned ₹${referralConfig.referrer.discountValue} off your next booking!`,
      channel: "PUSH",
      metadata: {
        couponCode: result.referrerCoupon.code,
        type: "REFERRAL_REWARD",
      },
      recipientId: referrer.id,
      recipientType: "CONSUMER",
      title: "Referral reward unlocked!",
    });
    referrerNotified = true;
  } catch {
    referrerNotified = false;
  }

  return {
    referral: {
      appliedAt: result.referral.appliedAt.toISOString(),
      referrerId: result.referral.referrerId,
    },
    referrerNotified,
    yourReward: {
      couponCode: result.refereeCoupon.code,
      discountValue: parseFloat(result.refereeCoupon.discountValue),
      minOrderAmount: parseFloat(result.refereeCoupon.minOrderAmount),
      validUntil: result.refereeCoupon.validUntil?.toISOString() ?? null,
    },
  };
};
