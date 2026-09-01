import { describe, expect, it, vi } from "vitest";

import { validateCouponForBooking } from "../src/api/v1/coupons/service.ts";
import * as repo from "../src/api/v1/coupons/repository.ts";

const baseCoupon = {
  applicableCategories: [] as string[],
  applicableServiceIds: [] as string[],
  code: "FLAT100",
  description: "Flat ₹100 off",
  discountType: "FLAT" as const,
  discountValue: "100.00",
  firstBookingOnly: false,
  id: "coupon-id",
  isActive: true,
  issuedToConsumerId: null,
  maxDiscountAmount: null,
  minOrderAmount: "499.00",
  perUserLimit: null,
  usageCount: 0,
  usageLimit: null,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("validateCouponForBooking", () => {
  it("trims and uppercases coupon codes before lookup", async () => {
    const findSpy = vi
      .spyOn(repo, "findCouponByCode")
      .mockResolvedValue(baseCoupon as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    const result = await validateCouponForBooking(" flat100 ", {
      amount: 2199,
      consumerId: "consumer-id",
    });

    expect(findSpy).toHaveBeenCalledWith("FLAT100");
    expect(result.discount).toBe(100);
    expect(result.validatedAmount).toBe(2199);
  });

  it("rejects orders below the minimum amount", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue(baseCoupon as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 430.82,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("Minimum order amount ₹499.00 required.");
  });
});
