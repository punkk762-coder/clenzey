export type ReferralRewardConfig = {
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  firstBookingOnly: boolean;
  minOrderAmount: number;
  validDays: number;
};

export const referralConfig = {
  referee: {
    discountType: "FLAT",
    discountValue: 200,
    firstBookingOnly: true,
    minOrderAmount: 799,
    validDays: 90,
  },
  referrer: {
    discountType: "FLAT",
    discountValue: 200,
    firstBookingOnly: false,
    minOrderAmount: 799,
    validDays: 90,
  },
} as const satisfies Record<string, ReferralRewardConfig>;

export const buildReferralShareMessage = (referralCode: string): string =>
  `Join Clenzey with my code ${referralCode} and get ₹${referralConfig.referee.discountValue} off your first booking!`;
