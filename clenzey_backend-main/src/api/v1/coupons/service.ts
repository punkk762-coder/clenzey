import { BadRequestError, NotFoundError } from "../../../errors/appErrors.ts";
import type { CouponRecord } from "./repository.ts";
import * as repo from "./repository.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;

const CATEGORY_LABELS: Record<string, string> = {
  CORPORATE: "Corporate",
  DEEP_CLEANING: "Deep Cleaning",
  DEEP_LUXE: "Deep Luxe",
  QUICK_SHINE: "Quick Shine",
};

export type CouponOffer = {
  applicableCategories: string[];
  code: string;
  ctaText: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  id: string;
  label: null | string;
  maxDiscountAmount: null | number;
  minOrderAmount: number;
  subtitle: string;
  title: string;
  validUntil: null | string;
};

const buildOfferTitle = (coupon: CouponRecord): string => {
  const discountValue = parseFloat(coupon.discountValue);
  const discountPart =
    coupon.discountType === "PERCENTAGE"
      ? `${discountValue}% Off`
      : `₹${discountValue} Off`;

  if (coupon.applicableCategories.length === 1) {
    const categoryKey = coupon.applicableCategories[0]!;
    const categoryLabel = CATEGORY_LABELS[categoryKey] ?? categoryKey;
    return `Get ${discountPart} ${categoryLabel}`;
  }

  return `Get ${discountPart}`;
};

const buildOfferLabel = (
  coupon: CouponRecord,
  now: Date,
): null | string => {
  if (coupon.firstBookingOnly) return "FIRST BOOKING";
  if (coupon.validUntil) {
    const daysLeft =
      (coupon.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 30) return "LIMITED OFFER";
  }
  return "SPECIAL OFFER";
};

const toCouponOffer = (coupon: CouponRecord): CouponOffer => {
  const now = new Date();

  return {
    applicableCategories: coupon.applicableCategories,
    code: coupon.code,
    ctaText: "Book Now",
    discountType: coupon.discountType,
    discountValue: parseFloat(coupon.discountValue),
    id: coupon.id,
    label: buildOfferLabel(coupon, now),
    maxDiscountAmount: coupon.maxDiscountAmount
      ? parseFloat(coupon.maxDiscountAmount)
      : null,
    minOrderAmount: parseFloat(coupon.minOrderAmount),
    subtitle: coupon.description ?? `Use code ${coupon.code} at checkout`,
    title: buildOfferTitle(coupon),
    validUntil: coupon.validUntil?.toISOString() ?? null,
  };
};

export type CouponValidationContext = {
  amount: number;
  consumerId: string;
  serviceCategory?: null | string;
  serviceId?: null | string;
};

export type CouponValidationResult = {
  code: string;
  couponId: string;
  description: null | string;
  discount: number;
  validatedAmount: number;
};

export const validateCouponForBooking = async (
  code: string,
  ctx: CouponValidationContext,
): Promise<CouponValidationResult> => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    throw new BadRequestError("Invalid coupon code.");
  }

  const coupon = await repo.findCouponByCode(normalizedCode);
  if (!coupon || !coupon.isActive) {
    throw new BadRequestError("Invalid coupon code.");
  }

  if (
    coupon.issuedToConsumerId &&
    coupon.issuedToConsumerId !== ctx.consumerId
  ) {
    throw new BadRequestError("This coupon is not valid for your account.");
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now)
    throw new BadRequestError("Coupon is not yet active.");
  if (coupon.validUntil && coupon.validUntil < now)
    throw new BadRequestError("Coupon has expired.");

  if (
    coupon.usageLimit !== null &&
    coupon.usageCount >= coupon.usageLimit
  ) {
    throw new BadRequestError("Coupon usage limit reached.");
  }

  if (coupon.perUserLimit !== null) {
    const used = await repo.countRedemptionsForUser(coupon.id, ctx.consumerId);
    if (used >= coupon.perUserLimit) {
      throw new BadRequestError("You have already used this coupon.");
    }
  }

  if (coupon.firstBookingOnly) {
    const prior = await repo.countTotalBookingsForConsumer(ctx.consumerId);
    if (prior > 0) {
      throw new BadRequestError(
        "This coupon is only valid on your first booking.",
      );
    }
  }

  if (parseFloat(coupon.minOrderAmount) > ctx.amount) {
    throw new BadRequestError(
      `Minimum order amount ₹${coupon.minOrderAmount} required.`,
    );
  }

  if (
    coupon.applicableServiceIds.length > 0 &&
    (!ctx.serviceId || !coupon.applicableServiceIds.includes(ctx.serviceId))
  ) {
    throw new BadRequestError("Coupon is not valid for this service.");
  }

  if (
    coupon.applicableCategories.length > 0 &&
    (!ctx.serviceCategory ||
      !coupon.applicableCategories.includes(
        ctx.serviceCategory as (typeof coupon.applicableCategories)[number],
      ))
  ) {
    throw new BadRequestError("Coupon is not valid for this service category.");
  }

  let discount = 0;
  if (coupon.discountType === "FLAT") {
    discount = parseFloat(coupon.discountValue);
  } else {
    discount = ctx.amount * (parseFloat(coupon.discountValue) / 100);
  }

  if (coupon.maxDiscountAmount) {
    discount = Math.min(discount, parseFloat(coupon.maxDiscountAmount));
  }

  discount = Math.min(discount, ctx.amount);

  return {
    code: coupon.code,
    couponId: coupon.id,
    description: coupon.description,
    discount: round2(discount),
    validatedAmount: round2(ctx.amount),
  };
};

export type CreateCouponInput = {
  applicableCategories?: string[];
  applicableServiceIds?: string[];
  code: string;
  description?: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  firstBookingOnly?: boolean;
  issuedToConsumerId?: string;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  perUserLimit?: number;
  usageLimit?: number;
  validFrom?: string;
  validUntil?: string;
};

export const createCoupon = async (input: CreateCouponInput) => {
  return await repo.insertCoupon({
    applicableCategories: (input.applicableCategories ?? []) as never,
    applicableServiceIds: input.applicableServiceIds ?? [],
    code: input.code.toUpperCase(),
    description: input.description,
    discountType: input.discountType,
    discountValue: String(input.discountValue),
    firstBookingOnly: input.firstBookingOnly ?? false,
    issuedToConsumerId: input.issuedToConsumerId ?? null,
    maxDiscountAmount:
      input.maxDiscountAmount !== undefined
        ? String(input.maxDiscountAmount)
        : null,
    minOrderAmount: String(input.minOrderAmount ?? 0),
    perUserLimit: input.perUserLimit ?? null,
    usageLimit: input.usageLimit ?? null,
    validFrom: input.validFrom ? new Date(input.validFrom) : null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
  });
};

export const updateCoupon = async (
  id: string,
  patch: Partial<CreateCouponInput> & { isActive?: boolean },
) => {
  const existing = await repo.findCouponById(id);
  if (!existing) throw new NotFoundError("Coupon not found.");

  const data: Partial<Parameters<typeof repo.updateCoupon>[1]> = {};
  if (patch.code !== undefined) data.code = patch.code.toUpperCase();
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.discountType !== undefined) data.discountType = patch.discountType;
  if (patch.discountValue !== undefined)
    data.discountValue = String(patch.discountValue);
  if (patch.maxDiscountAmount !== undefined)
    data.maxDiscountAmount = String(patch.maxDiscountAmount);
  if (patch.minOrderAmount !== undefined)
    data.minOrderAmount = String(patch.minOrderAmount);
  if (patch.usageLimit !== undefined) data.usageLimit = patch.usageLimit;
  if (patch.perUserLimit !== undefined) data.perUserLimit = patch.perUserLimit;
  if (patch.firstBookingOnly !== undefined)
    data.firstBookingOnly = patch.firstBookingOnly;
  if (patch.applicableServiceIds !== undefined)
    data.applicableServiceIds = patch.applicableServiceIds;
  if (patch.applicableCategories !== undefined)
    data.applicableCategories = patch.applicableCategories as never;
  if (patch.validFrom !== undefined)
    data.validFrom = patch.validFrom ? new Date(patch.validFrom) : null;
  if (patch.validUntil !== undefined)
    data.validUntil = patch.validUntil ? new Date(patch.validUntil) : null;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  return await repo.updateCoupon(id, data);
};

export const listCoupons = repo.listCoupons;

export const listActiveOffers = async (filter: {
  limit?: number;
} = {}): Promise<CouponOffer[]> => {
  const coupons = await repo.listActiveOffers(filter);
  return coupons.map(toCouponOffer);
};

export const getCouponById = repo.findCouponById;
export const recordRedemption = repo.insertRedemption;
export const incrementUsage = repo.incrementUsageCount;
