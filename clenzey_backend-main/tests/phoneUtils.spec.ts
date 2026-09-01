import { describe, expect, it } from "vitest";

import { formatPhoneForMsg91 } from "../src/utilities/phoneUtils.ts";

describe("formatPhoneForMsg91", () => {
  it("strips non-digit characters", () => {
    expect(formatPhoneForMsg91("+91 9876-543210")).toBe("919876543210");
  });

  it("returns digits-only for already clean numbers", () => {
    expect(formatPhoneForMsg91("919876543210")).toBe("919876543210");
  });
});
