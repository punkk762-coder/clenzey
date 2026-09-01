import { pricingConfig, type SubscriptionPlan } from "../../../configs/pricingConfig.ts";

export type AppliedCoupon = {
  code: string;
  discount: number;
};

/**
 * Runtime-configurable pricing rates (managed from the admin panel and applied
 * globally to every service). GST and platform-fee-percent are fractions
 * (e.g. 0.18 for 18%); the flat fee is an absolute currency amount.
 */
export type PlatformPricingRates = {
  gstRate: number;
  platformFeeFlat: number;
  platformFeePercent: number;
};

export type PricingAddon = {
  name: string;
  price: number;
  quantity?: number;
};

export type PricingBreakdown = {
  addonsTotal: number;
  basePrice: number;
  couponCode: null | string;
  couponDiscount: number;
  discountAmount: number;
  lineItems: PricingLineItem[];
  platformFee: number;
  subscriptionDiscount: number;
  subtotal: number;
  surgeAmount: number;
  surgeMultiplier: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type PricingContext = {
  addons: PricingAddon[];
  appliedCoupon?: AppliedCoupon;
  basePrice: number;
  /**
   * Overrides for the global GST / platform-fee rates. When omitted, the
   * static defaults from `pricingConfig` are used.
   */
  rates?: PlatformPricingRates;
  subscriptionPlan: SubscriptionPlan;
  subVariantPrice: number;
  surgeMultiplier: number;
};

export type PricingLineItem = {
  amount: number;
  label: string;
  type: "addon" | "base" | "discount" | "fee" | "surge" | "tax";
};

type PricingState = {
  ctx: PricingContext;
  out: PricingBreakdown;
  rates: PlatformPricingRates;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const defaultRates: PlatformPricingRates = {
  gstRate: pricingConfig.gstRate,
  platformFeeFlat: pricingConfig.platformFeeFlat,
  platformFeePercent: pricingConfig.platformFeePercent,
};

const initialState = (ctx: PricingContext): PricingState => ({
  ctx,
  out: {
    addonsTotal: 0,
    basePrice: 0,
    couponCode: ctx.appliedCoupon?.code ?? null,
    couponDiscount: 0,
    discountAmount: 0,
    lineItems: [],
    platformFee: 0,
    subscriptionDiscount: 0,
    subtotal: 0,
    surgeAmount: 0,
    surgeMultiplier: ctx.surgeMultiplier,
    taxableAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
  },
  rates: ctx.rates ?? defaultRates,
});

type PricingStep = (state: PricingState) => PricingState;

const applyBase: PricingStep = (state) => {
  const base = state.ctx.basePrice + state.ctx.subVariantPrice;
  state.out.basePrice = round2(base);
  state.out.lineItems.push({ amount: round2(base), label: "Base", type: "base" });
  return state;
};

const applyAddons: PricingStep = (state) => {
  let total = 0;
  for (const a of state.ctx.addons) {
    const qty = a.quantity ?? 1;
    const amount = a.price * qty;
    total += amount;
    state.out.lineItems.push({
      amount: round2(amount),
      label: qty > 1 ? `${a.name} × ${qty}` : a.name,
      type: "addon",
    });
  }
  state.out.addonsTotal = round2(total);
  return state;
};

const applySubtotal: PricingStep = (state) => {
  state.out.subtotal = round2(state.out.basePrice + state.out.addonsTotal);
  return state;
};

const applySurge: PricingStep = (state) => {
  const mult = state.ctx.surgeMultiplier;
  if (mult <= 1) return state;
  const amount = round2(state.out.subtotal * (mult - 1));
  state.out.surgeAmount = amount;
  state.out.surgeMultiplier = mult;
  if (amount > 0) {
    state.out.lineItems.push({
      amount,
      label: `Surge (${mult}×)`,
      type: "surge",
    });
  }
  return state;
};

const applySubscriptionDiscount: PricingStep = (state) => {
  const rate = pricingConfig.subscriptionDiscount[state.ctx.subscriptionPlan];
  if (!rate) return state;
  const baseForDiscount = state.out.subtotal + state.out.surgeAmount;
  const discount = round2(baseForDiscount * rate);
  state.out.subscriptionDiscount = discount;
  if (discount > 0) {
    state.out.lineItems.push({
      amount: -discount,
      label: `${state.ctx.subscriptionPlan} plan (${Math.round(rate * 100)}% off)`,
      type: "discount",
    });
  }
  return state;
};

const applyCoupon: PricingStep = (state) => {
  const coupon = state.ctx.appliedCoupon;
  if (!coupon || coupon.discount <= 0) return state;
  state.out.couponDiscount = round2(coupon.discount);
  state.out.lineItems.push({
    amount: -round2(coupon.discount),
    label: `Coupon ${coupon.code}`,
    type: "discount",
  });
  return state;
};

const computeDiscountTotal: PricingStep = (state) => {
  state.out.discountAmount = round2(
    state.out.subscriptionDiscount + state.out.couponDiscount,
  );
  state.out.taxableAmount = round2(
    Math.max(
      0,
      state.out.subtotal +
        state.out.surgeAmount -
        state.out.discountAmount,
    ),
  );
  return state;
};

const applyTax: PricingStep = (state) => {
  const amount = round2(state.out.taxableAmount * state.rates.gstRate);
  state.out.taxAmount = amount;
  if (amount > 0) {
    state.out.lineItems.push({
      amount,
      label: `GST (${Math.round(state.rates.gstRate * 100)}%)`,
      type: "tax",
    });
  }
  return state;
};

const applyPlatformFee: PricingStep = (state) => {
  const flat = state.rates.platformFeeFlat;
  const pct = round2(state.out.taxableAmount * state.rates.platformFeePercent);
  const fee = round2(flat + pct);
  state.out.platformFee = fee;
  if (fee > 0) {
    state.out.lineItems.push({
      amount: fee,
      label: "Platform fee",
      type: "fee",
    });
  }
  return state;
};

const finalize: PricingStep = (state) => {
  state.out.totalAmount = round2(
    state.out.taxableAmount + state.out.taxAmount + state.out.platformFee,
  );
  return state;
};

const PIPELINE: PricingStep[] = [
  applyBase,
  applyAddons,
  applySubtotal,
  applySurge,
  applySubscriptionDiscount,
  applyCoupon,
  computeDiscountTotal,
  applyTax,
  applyPlatformFee,
  finalize,
];

export const computePricing = (ctx: PricingContext): PricingBreakdown => {
  let state = initialState(ctx);
  for (const step of PIPELINE) {
    state = step(state);
  }
  return state.out;
};
