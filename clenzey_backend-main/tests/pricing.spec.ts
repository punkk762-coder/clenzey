import { HttpStatusCode } from "axios";
import { describe, expect, it, vi } from "vitest";

import { computePricing } from "../src/api/v1/bookings/pricing.ts";

describe("computePricing", () => {
  it("computes base price with no addons or discounts", () => {
    const result = computePricing({
      addons: [],
      basePrice: 500,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.basePrice).toBe(500);
    expect(result.subtotal).toBe(500);
    expect(result.totalAmount).toBeGreaterThan(500);
    expect(result.lineItems.some((item) => item.type === "tax")).toBe(true);
    expect(result.lineItems.some((item) => item.type === "fee")).toBe(true);
  });

  it("applies addon quantities", () => {
    const result = computePricing({
      addons: [{ name: "Extra bathroom", price: 200, quantity: 2 }],
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.addonsTotal).toBe(400);
    expect(result.subtotal).toBe(1400);
  });

  it("applies surge multiplier above 1", () => {
    const result = computePricing({
      addons: [],
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1.5,
    });

    expect(result.surgeAmount).toBe(500);
    expect(result.surgeMultiplier).toBe(1.5);
  });

  it("applies subscription and coupon discounts", () => {
    const result = computePricing({
      addons: [],
      appliedCoupon: { code: "FLAT100", discount: 100 },
      basePrice: 2000,
      subscriptionPlan: "MONTHLY",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.subscriptionDiscount).toBeGreaterThan(0);
    expect(result.couponDiscount).toBe(100);
    expect(result.discountAmount).toBe(
      result.subscriptionDiscount + result.couponDiscount,
    );
  });

  it("never produces negative taxable amount", () => {
    const result = computePricing({
      addons: [],
      appliedCoupon: { code: "BIG", discount: 99999 },
      basePrice: 100,
      subscriptionPlan: "MONTHLY",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.taxableAmount).toBe(0);
    expect(result.totalAmount).toBeGreaterThanOrEqual(0);
  });

  it("skips surge when multiplier is 1 or less", () => {
    const result = computePricing({
      addons: [],
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.surgeAmount).toBe(0);
    expect(result.lineItems.some((item) => item.type === "surge")).toBe(false);
  });

  it("skips subscription discount for ONE_TIME plan", () => {
    const result = computePricing({
      addons: [],
      basePrice: 1000,
      subscriptionPlan: "ONE_TIME",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.subscriptionDiscount).toBe(0);
    expect(
      result.lineItems.some((item) => item.label.includes("plan")),
    ).toBe(false);
  });

  it("skips coupon discount when discount is zero or negative", () => {
    const result = computePricing({
      addons: [],
      appliedCoupon: { code: "ZERO", discount: 0 },
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.couponDiscount).toBe(0);
    expect(result.lineItems.some((item) => item.label.includes("Coupon"))).toBe(
      false,
    );
  });

  it("uses addon name without quantity suffix when qty is 1", () => {
    const result = computePricing({
      addons: [{ name: "Extra bathroom", price: 200, quantity: 1 }],
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    const addonItem = result.lineItems.find((item) => item.type === "addon");
    expect(addonItem?.label).toBe("Extra bathroom");
  });

  it("includes sub-variant price in the base total", () => {
    const result = computePricing({
      addons: [],
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 250,
      surgeMultiplier: 1,
    });

    expect(result.basePrice).toBe(1250);
    expect(result.subtotal).toBe(1250);
  });

  it("uses configurable GST and platform fee rates when provided", () => {
    const result = computePricing({
      addons: [],
      basePrice: 1000,
      rates: { gstRate: 0.05, platformFeeFlat: 50, platformFeePercent: 0.02 },
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.taxAmount).toBe(50);
    expect(result.platformFee).toBe(70);
    expect(result.totalAmount).toBe(1120);
    expect(
      result.lineItems.some((item) => item.label === "GST (5%)"),
    ).toBe(true);
  });

  it("falls back to default rates when none are provided", () => {
    const result = computePricing({
      addons: [],
      basePrice: 1000,
      subscriptionPlan: "NONE",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(result.taxAmount).toBe(180);
    expect(result.platformFee).toBe(19);
    expect(result.totalAmount).toBe(1199);
  });
});
