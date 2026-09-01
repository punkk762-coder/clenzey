export const pricingConfig = {
  gstRate: 0.18,
  platformFeeFlat: 19,
  platformFeePercent: 0,
  subscriptionDiscount: {
    CUSTOM: 0,
    DAILY: 0.05,
    FORTNIGHTLY: 0.08,
    MONTHLY: 0.15,
    ONE_TIME: 0,
    WEEKLY: 0.1,
  },
} as const;

export type SubscriptionPlan = keyof typeof pricingConfig.subscriptionDiscount;
