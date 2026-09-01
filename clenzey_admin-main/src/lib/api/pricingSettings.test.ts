import { describe, expect, it } from "vitest";

import { mapPlatformPricingSettings } from "./pricingSettings";

describe("mapPlatformPricingSettings", () => {
  it("maps backend settings to the admin UI shape", () => {
    expect(
      mapPlatformPricingSettings({
        id: "cfg-1",
        gstRate: "18.00",
        platformFeeFlat: "19.00",
        platformFeePercent: "0.00",
        effectiveFrom: "2026-07-12T00:00:00.000Z",
        isDefault: false,
      }),
    ).toEqual({
      id: "cfg-1",
      gstRate: 18,
      platformFeeFlat: 19,
      platformFeePercent: 0,
      effectiveFrom: "2026-07-12T00:00:00.000Z",
      isDefault: false,
    });
  });

  it("maps default fallback settings", () => {
    expect(
      mapPlatformPricingSettings({
        id: null,
        gstRate: 18,
        platformFeeFlat: 19,
        platformFeePercent: 0,
        effectiveFrom: null,
        isDefault: true,
      }),
    ).toEqual({
      id: null,
      gstRate: 18,
      platformFeeFlat: 19,
      platformFeePercent: 0,
      effectiveFrom: null,
      isDefault: true,
    });
  });
});
