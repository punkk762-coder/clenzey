import { describe, expect, it } from "vitest";

import { computePricing } from "../src/api/v1/bookings/pricing.ts";
import { assertCorporateBookingInput } from "../src/api/v1/bookings/service.ts";
import {
  computeLargeOfficeBasePrice,
  type LargeOfficeScope,
} from "../src/api/v1/services/largeOfficePricing.ts";

const baseScope: LargeOfficeScope = {
  cleaningFrequency: "ONE_TIME",
  employeeBand: "100_200",
  floorsCount: 1,
  officeAreaSqFt: "UNDER_5000",
  restroomBand: "UNDER_10",
};

describe("computeLargeOfficeBasePrice", () => {
  it("uses the existing 51-100 tier without an uplift for the smallest scope", () => {
    const result = computeLargeOfficeBasePrice(
      baseScope,
      7999,
      "51–100 Employees",
    );

    expect(result.computedBasePrice).toBe(7999);
    expect(result.uplifts).toEqual([]);
    expect(result.estimatedDurationMin).toBe(300);
    expect(result.estimatedTeam).toBe(4);
  });

  it("applies the large-area uplift for 100-200 employees", () => {
    const result = computeLargeOfficeBasePrice(
      { ...baseScope, officeAreaSqFt: "OVER_15000" },
      7999,
      "51–100 Employees",
    );

    expect(result.computedBasePrice).toBe(9199);
    expect(result.uplifts).toEqual([
      expect.objectContaining({ label: "Office area", percent: 15 }),
    ]);
  });

  it("adds employee, area, and floor uplifts from the same tier base", () => {
    const result = computeLargeOfficeBasePrice(
      {
        ...baseScope,
        employeeBand: "200_500",
        floorsCount: 3,
        officeAreaSqFt: "5000_15000",
      },
      7999,
      "51–100 Employees",
    );

    expect(result.computedBasePrice).toBe(13198);
    expect(result.uplifts.map((uplift) => uplift.percent)).toEqual([25, 10, 30]);
  });

  it("caps the floor answer at the configured 4+ uplift", () => {
    const result = computeLargeOfficeBasePrice(
      { ...baseScope, floorsCount: 4 },
      7999,
      "51–100 Employees",
    );

    expect(result.computedBasePrice).toBe(11599);
    expect(result.uplifts[0]).toEqual(
      expect.objectContaining({ label: "Additional floors or wings", percent: 45 }),
    );
  });

  it("applies restroom uplift for larger washroom counts", () => {
    const result = computeLargeOfficeBasePrice(
      { ...baseScope, restroomBand: "26_50" },
      7999,
      "51–100 Employees",
    );

    expect(result.computedBasePrice).toBe(9599);
    expect(result.uplifts).toEqual([
      expect.objectContaining({ label: "Restrooms", percent: 20 }),
    ]);
  });

  it("leaves frequency discounts to the standard pricing pipeline", () => {
    const estimate = computeLargeOfficeBasePrice(
      { ...baseScope, cleaningFrequency: "WEEKLY" },
      7999,
      "51–100 Employees",
    );
    const priced = computePricing({
      addons: [],
      basePrice: estimate.computedBasePrice,
      subscriptionPlan: "WEEKLY",
      subVariantPrice: 0,
      surgeMultiplier: 1,
    });

    expect(estimate.computedBasePrice).toBe(7999);
    expect(priced.subscriptionDiscount).toBe(799.9);
  });
});

describe("large-office booking guard", () => {
  const corporateDetails = {
    cleaningFrequency: "ONE_TIME" as const,
    companyName: "Example Ltd",
    contactEmail: "office@example.com",
    contactPerson: "Priya Sharma",
    schedulePreference: "AFTER_OFFICE" as const,
  };

  it("blocks inspection variants without a completed scope", () => {
    expect(() =>
      assertCorporateBookingInput(
        "CORPORATE",
        { pricingModel: "INSPECTION" },
        corporateDetails,
      )
    ).toThrow(/requires a custom quotation/i);
  });

  it("allows inspection variants with a completed scope", () => {
    expect(() =>
      assertCorporateBookingInput(
        "CORPORATE",
        { pricingModel: "INSPECTION" },
        corporateDetails,
        baseScope,
      )
    ).not.toThrow();
  });
});
