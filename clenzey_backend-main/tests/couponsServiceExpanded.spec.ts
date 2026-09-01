import { afterEach, describe, expect, it, vi } from "vitest";

import * as repo from "../src/api/v1/coupons/repository.ts";
import {
  createCoupon,
  listActiveOffers,
  updateCoupon,
  validateCouponForBooking,
} from "../src/api/v1/coupons/service.ts";
import { NotFoundError } from "../src/errors/appErrors.ts";

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

describe("validateCouponForBooking edge cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects empty coupon code", async () => {
    await expect(
      validateCouponForBooking("   ", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("Invalid coupon code.");
  });

  it("rejects inactive coupons", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      isActive: false,
    } as never);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("Invalid coupon code.");
  });

  it("rejects when issuedToConsumerId does not match", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      issuedToConsumerId: "other-consumer",
      minOrderAmount: "0.00",
    } as never);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("This coupon is not valid for your account.");
  });

  it("rejects coupons not yet active", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      validFrom: new Date("2099-01-01T00:00:00Z"),
      minOrderAmount: "0.00",
    } as never);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("Coupon is not yet active.");
  });

  it("rejects when global usage limit is reached", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      usageLimit: 10,
      usageCount: 10,
      minOrderAmount: "0.00",
    } as never);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("Coupon usage limit reached.");
  });

  it("rejects first-booking-only coupons for returning customers", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      firstBookingOnly: true,
      minOrderAmount: "0.00",
    } as never);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(2);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("This coupon is only valid on your first booking.");
  });

  it("calculates flat discount", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      discountType: "FLAT",
      discountValue: "100.00",
      minOrderAmount: "0.00",
    } as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    const result = await validateCouponForBooking("FLAT100", {
      amount: 500,
      consumerId: "consumer-id",
    });

    expect(result.discount).toBe(100);
    expect(result.validatedAmount).toBe(500);
  });

  it("accepts coupons when service category matches", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      applicableCategories: ["QUICK_SHINE"],
      minOrderAmount: "0.00",
    } as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    const result = await validateCouponForBooking("FLAT100", {
      amount: 1000,
      consumerId: "consumer-id",
      serviceCategory: "QUICK_SHINE",
    });

    expect(result.discount).toBe(100);
  });

  it("rejects expired coupons", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      validUntil: new Date("2020-01-01T00:00:00Z"),
    } as never);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("Coupon has expired.");
  });

  it("rejects when per-user redemption limit is reached", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      perUserLimit: 1,
    } as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(1);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
      }),
    ).rejects.toThrow("You have already used this coupon.");
  });

  it("calculates percentage discount and caps by maxDiscountAmount", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      code: "SAVE20",
      discountType: "PERCENTAGE",
      discountValue: "20.00",
      maxDiscountAmount: "300.00",
      minOrderAmount: "0.00",
    } as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    const result = await validateCouponForBooking("SAVE20", {
      amount: 2000,
      consumerId: "consumer-id",
    });

    expect(result.discount).toBe(300);
    expect(result.validatedAmount).toBe(2000);
  });

  it("rejects coupons restricted to a different service", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      applicableServiceIds: ["service-a"],
      minOrderAmount: "0.00",
    } as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
        serviceId: "service-b",
      }),
    ).rejects.toThrow("Coupon is not valid for this service.");
  });

  it("rejects coupons restricted to a different service category", async () => {
    vi.spyOn(repo, "findCouponByCode").mockResolvedValue({
      ...baseCoupon,
      applicableCategories: ["DEEP_CLEANING"],
      minOrderAmount: "0.00",
    } as never);
    vi.spyOn(repo, "countRedemptionsForUser").mockResolvedValue(0);
    vi.spyOn(repo, "countTotalBookingsForConsumer").mockResolvedValue(0);

    await expect(
      validateCouponForBooking("FLAT100", {
        amount: 1000,
        consumerId: "consumer-id",
        serviceCategory: "QUICK_SHINE",
      }),
    ).rejects.toThrow("Coupon is not valid for this service category.");
  });
});

describe("createCoupon", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes and delegates to insertCoupon", async () => {
    const created = { ...baseCoupon, code: "WELCOME50" };
    const insertSpy = vi
      .spyOn(repo, "insertCoupon")
      .mockResolvedValue(created as never);

    const result = await createCoupon({
      code: "welcome50",
      discountType: "FLAT",
      discountValue: 50,
      minOrderAmount: 299,
      applicableCategories: ["QUICK_SHINE"],
      validUntil: "2026-12-31T23:59:59.000Z",
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "WELCOME50",
        discountValue: "50",
        minOrderAmount: "299",
        applicableCategories: ["QUICK_SHINE"],
        validUntil: new Date("2026-12-31T23:59:59.000Z"),
      }),
    );
    expect(result).toBe(created);
  });

  it("patches all optional coupon fields on update", async () => {
    vi.spyOn(repo, "findCouponById").mockResolvedValue(baseCoupon as never);
    const updated = {
      ...baseCoupon,
      maxDiscountAmount: "250.00",
      usageLimit: 100,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    };
    vi.spyOn(repo, "updateCoupon").mockResolvedValue(updated as never);

    await updateCoupon("coupon-id", {
      maxDiscountAmount: 250,
      usageLimit: 100,
      perUserLimit: 2,
      firstBookingOnly: true,
      applicableServiceIds: ["service-1"],
      applicableCategories: ["DEEP_CLEANING"],
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-12-31T23:59:59.000Z",
    });

    expect(repo.updateCoupon).toHaveBeenCalledWith("coupon-id", {
      maxDiscountAmount: "250",
      usageLimit: 100,
      perUserLimit: 2,
      firstBookingOnly: true,
      applicableServiceIds: ["service-1"],
      applicableCategories: ["DEEP_CLEANING"],
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: new Date("2026-12-31T23:59:59.000Z"),
    });
  });
});

describe("updateCoupon", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws NotFoundError when coupon does not exist", async () => {
    vi.spyOn(repo, "findCouponById").mockResolvedValue(null);

    await expect(
      updateCoupon("missing-id", { description: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("patches fields and delegates to repository updateCoupon", async () => {
    vi.spyOn(repo, "findCouponById").mockResolvedValue(baseCoupon as never);
    const updated = { ...baseCoupon, description: "Updated offer", isActive: false };
    const updateSpy = vi
      .spyOn(repo, "updateCoupon")
      .mockResolvedValue(updated as never);

    const result = await updateCoupon("coupon-id", {
      code: "newcode",
      description: "Updated offer",
      discountValue: 150,
      isActive: false,
    });

    expect(updateSpy).toHaveBeenCalledWith("coupon-id", {
      code: "NEWCODE",
      description: "Updated offer",
      discountValue: "150",
      isActive: false,
    });
    expect(result).toBe(updated);
  });
});

describe("listActiveOffers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("maps active coupons into offer cards", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00.000Z"));

    vi.spyOn(repo, "listActiveOffers").mockResolvedValue([
      {
        ...baseCoupon,
        code: "DEEP25",
        discountType: "PERCENTAGE",
        discountValue: "25.00",
        applicableCategories: ["DEEP_CLEANING"],
        validUntil: new Date("2026-07-20T12:00:00.000Z"),
      },
    ] as never);

    const offers = await listActiveOffers({ limit: 5 });

    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      code: "DEEP25",
      discountType: "PERCENTAGE",
      discountValue: 25,
      title: "Get 25% Off Deep Cleaning",
      label: "LIMITED OFFER",
      ctaText: "Book Now",
      validUntil: "2026-07-20T12:00:00.000Z",
    });
  });

  it("labels first-booking coupons and generic special offers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00.000Z"));

    vi.spyOn(repo, "listActiveOffers").mockResolvedValue([
      {
        ...baseCoupon,
        code: "FIRST50",
        firstBookingOnly: true,
        validUntil: null,
      },
      {
        ...baseCoupon,
        code: "GENERIC10",
        discountType: "PERCENTAGE",
        discountValue: "10.00",
        validUntil: new Date("2027-01-01T00:00:00.000Z"),
      },
    ] as never);

    const offers = await listActiveOffers();

    expect(offers[0]?.label).toBe("FIRST BOOKING");
    expect(offers[0]?.title).toBe("Get ₹100 Off");
    expect(offers[1]?.label).toBe("SPECIAL OFFER");
  });
});
