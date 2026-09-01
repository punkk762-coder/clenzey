import { describe, expect, it } from "vitest";

import {
  exceedsAvailableBalance,
  normalizeAvailableBalance,
  payoutExceedsBalanceMessage,
  roundMoney,
} from "../src/utilities/moneyUtils.ts";

describe("moneyUtils", () => {
  it("rounds money to two decimal places", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });

  it("treats floating-point dust as zero available balance", () => {
    expect(normalizeAvailableBalance(-3.637978807091713e-12)).toBe(0);
    expect(normalizeAvailableBalance(0.004)).toBe(0);
    expect(normalizeAvailableBalance(0.01)).toBe(0.01);
  });

  it("does not allow payouts when balance is effectively zero", () => {
    expect(
      exceedsAvailableBalance(20000, -3.637978807091713e-12),
    ).toBe(true);
    expect(exceedsAvailableBalance(0.01, 0.004)).toBe(true);
    expect(exceedsAvailableBalance(100, 100)).toBe(false);
    expect(exceedsAvailableBalance(99.99, 100)).toBe(false);
  });

  it("formats payout errors without scientific notation", () => {
    expect(
      payoutExceedsBalanceMessage(
        20000,
        -3.637978807091713e-12,
      ),
    ).toBe(
      "This partner has no earnings available to pay out. Record salary or incentives first, or wait until existing payouts are settled.",
    );

    expect(payoutExceedsBalanceMessage(1500, 1000)).toContain("₹1,500.00");
    expect(payoutExceedsBalanceMessage(1500, 1000)).toContain("₹1,000.00");
  });
});
