import { describe, expect, it } from "vitest";

import { subscriptionPlanEnum } from "../src/db/schema/enums.ts";

describe("corporate booking schema support", () => {
  it("includes extended subscription plans", () => {
    expect(subscriptionPlanEnum.enumValues).toEqual(
      expect.arrayContaining(["DAILY", "FORTNIGHTLY", "CUSTOM"]),
    );
  });
});
