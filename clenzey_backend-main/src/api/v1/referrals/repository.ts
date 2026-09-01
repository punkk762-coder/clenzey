import { HttpStatusCode } from "axios";
import { and, desc, eq, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  consumers,
  coupons,
  referrals,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import type { ReferralRewardConfig } from "../../../configs/referralConfig.ts";
import { generateReferralCode } from "../../../utilities/commonUtils.ts";

export type ConsumerRecord = typeof consumers.$inferSelect;
export type ReferralRecord = typeof referrals.$inferSelect;
export type CouponRecord = typeof coupons.$inferSelect;

export const findConsumerById = async (
  id: string,
): Promise<ConsumerRecord | null> => {
  const [row] = await db
    .select()
    .from(consumers)
    .where(eq(consumers.id, id))
    .limit(1);
  return row ?? null;
};

export const findConsumerByReferralCode = async (
  code: string,
): Promise<ConsumerRecord | null> => {
  const [row] = await db
    .select()
    .from(consumers)
    .where(eq(consumers.referralCode, code.toUpperCase()))
    .limit(1);
  return row ?? null;
};

export const findReferralByRefereeId = async (
  refereeId: string,
): Promise<ReferralRecord | null> => {
  const [row] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, refereeId))
    .limit(1);
  return row ?? null;
};

export const listReferralsByReferrerId = async (
  referrerId: string,
): Promise<ReferralRecord[]> => {
  return await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, referrerId))
    .orderBy(desc(referrals.appliedAt));
};

export const listIssuedCouponsForConsumer = async (
  consumerId: string,
): Promise<CouponRecord[]> => {
  return await db
    .select()
    .from(coupons)
    .where(eq(coupons.issuedToConsumerId, consumerId))
    .orderBy(desc(coupons.createdAt));
};

export const isCouponRedeemed = async (couponId: string): Promise<boolean> => {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM coupon_redemptions WHERE coupon_id = ${couponId}`,
  );
  return (result.rows[0]?.count ?? 0) > 0;
};

const createRewardCoupon = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  consumerId: string,
  config: ReferralRewardConfig,
  description: string,
): Promise<CouponRecord> => {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + config.validDays);

  const [coupon] = await tx
    .insert(coupons)
    .values({
      code: `RWD-${generateReferralCode()}`,
      description,
      discountType: config.discountType,
      discountValue: String(config.discountValue),
      firstBookingOnly: config.firstBookingOnly,
      issuedToConsumerId: consumerId,
      isActive: true,
      minOrderAmount: String(config.minOrderAmount),
      perUserLimit: 1,
      usageLimit: 1,
      validUntil,
    })
    .returning();

  if (!coupon) {
    throw new AppError("Failed to create reward coupon", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }

  return coupon;
};

export type ApplyReferralInput = {
  refereeId: string;
  referralCode: string;
  referrerId: string;
};

export type ApplyReferralResult = {
  refereeCoupon: CouponRecord;
  referral: ReferralRecord;
  referrerCoupon: CouponRecord;
};

export const applyReferralTransaction = async (
  input: ApplyReferralInput,
  refereeConfig: ReferralRewardConfig,
  referrerConfig: ReferralRewardConfig,
): Promise<ApplyReferralResult> => {
  return await db.transaction(async (tx) => {
    const [updatedReferee] = await tx
      .update(consumers)
      .set({ referrerId: input.referrerId })
      .where(
        and(
          eq(consumers.id, input.refereeId),
          sql`${consumers.referrerId} IS NULL`,
        ),
      )
      .returning();

    if (!updatedReferee) {
      throw new AppError("Referral code already applied", {
        error: { code: ErrorCode.CONFLICT_ERROR },
        statusCode: HttpStatusCode.Conflict,
      });
    }

    const refereeCoupon = await createRewardCoupon(
      tx,
      input.refereeId,
      refereeConfig,
      "Referral reward — welcome bonus",
    );

    const referrerCoupon = await createRewardCoupon(
      tx,
      input.referrerId,
      referrerConfig,
      "Referral reward — friend joined",
    );

    const [referral] = await tx
      .insert(referrals)
      .values({
        appliedAt: new Date(),
        refereeCouponId: refereeCoupon.id,
        refereeId: input.refereeId,
        referralCode: input.referralCode.toUpperCase(),
        referrerCouponId: referrerCoupon.id,
        referrerId: input.referrerId,
      })
      .returning();

    if (!referral) {
      throw new AppError("Failed to record referral", {
        error: { code: ErrorCode.SERVER_ERROR },
        statusCode: HttpStatusCode.InternalServerError,
      });
    }

    return { refereeCoupon, referral, referrerCoupon };
  });
};

export const findReferralRoleForCoupon = async (
  consumerId: string,
  couponId: string,
): Promise<"REFEREE" | "REFERRER" | null> => {
  const [asReferee] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(
        eq(referrals.refereeId, consumerId),
        eq(referrals.refereeCouponId, couponId),
      ),
    )
    .limit(1);
  if (asReferee) return "REFEREE";

  const [asReferrer] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, consumerId),
        eq(referrals.referrerCouponId, couponId),
      ),
    )
    .limit(1);
  if (asReferrer) return "REFERRER";

  return null;
};
