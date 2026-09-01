export type ReferralRewardRole = 'REFEREE' | 'REFERRER';

export type ReferralDiscountType = 'FLAT' | 'PERCENTAGE';

export interface ReferralReward {
  role: ReferralRewardRole;
  couponCode: string;
  discountType: ReferralDiscountType;
  discountValue: number;
  minOrderAmount: number;
  validUntil: string;
  redeemed: boolean;
}

export interface ReferralMade {
  appliedAt: string;
  refereeRewardIssued: boolean;
}

export interface AppliedReferral {
  referralCode: string;
  appliedAt: string;
}

export interface ReferralProfile {
  referralCode: string;
  shareMessage: string;
  hasAppliedReferral: boolean;
  appliedReferral: AppliedReferral | null;
  rewards: {
    received: ReferralReward[];
    referralsMade: ReferralMade[];
  };
}

export interface ApplyReferralPayload {
  referralCode: string;
}

export interface ApplyReferralResponse {
  referral: {
    referrerId: string;
    appliedAt: string;
  };
  yourReward: {
    couponCode: string;
    discountValue: number;
    minOrderAmount: number;
    validUntil: string;
  };
  referrerNotified: boolean;
}
