export const LARGE_OFFICE_EMPLOYEE_BANDS = [
  "100_200",
  "200_500",
  "500_PLUS",
] as const;

export const LARGE_OFFICE_AREA_BANDS = [
  "UNDER_5000",
  "5000_15000",
  "OVER_15000",
] as const;

export const LARGE_OFFICE_RESTROOM_BANDS = [
  "UNDER_10",
  "10_25",
  "26_50",
  "OVER_50",
] as const;

export type LargeOfficeAreaBand = typeof LARGE_OFFICE_AREA_BANDS[number];
export type LargeOfficeEmployeeBand =
  typeof LARGE_OFFICE_EMPLOYEE_BANDS[number];
export type LargeOfficeRestroomBand =
  typeof LARGE_OFFICE_RESTROOM_BANDS[number];

export type LargeOfficePriceResult = {
  basePrice: number;
  computedBasePrice: number;
  estimatedDurationMin: number;
  estimatedTeam: number;
  mappedTierLabel: string;
  uplifts: LargeOfficePriceUplift[];
};

export type LargeOfficePriceUplift = {
  amount: number;
  label: string;
  percent: number;
};

export type LargeOfficeScope = {
  cleaningFrequency:
    | "CUSTOM"
    | "DAILY"
    | "FORTNIGHTLY"
    | "MONTHLY"
    | "ONE_TIME"
    | "WEEKLY";
  employeeBand: LargeOfficeEmployeeBand;
  floorsCount: 1 | 2 | 3 | 4;
  officeAreaSqFt: LargeOfficeAreaBand;
  restroomBand: LargeOfficeRestroomBand;
};

const EMPLOYEE_UPLIFT: Record<LargeOfficeEmployeeBand, number> = {
  "500_PLUS": 50,
  "100_200": 0,
  "200_500": 25,
};

const RESTROOM_UPLIFT: Record<LargeOfficeRestroomBand, number> = {
  "10_25": 10,
  "26_50": 20,
  "OVER_50": 35,
  "UNDER_10": 0,
};

const AREA_UPLIFT: Record<LargeOfficeEmployeeBand, Record<LargeOfficeAreaBand, number>> = {
  "500_PLUS": {
    "5000_15000": 10,
    "OVER_15000": 20,
    "UNDER_5000": 0,
  },
  "100_200": {
    "5000_15000": 0,
    "OVER_15000": 15,
    "UNDER_5000": 0,
  },
  "200_500": {
    "5000_15000": 10,
    "OVER_15000": 20,
    "UNDER_5000": 0,
  },
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const computeLargeOfficeBasePrice = (
  scope: LargeOfficeScope,
  tierBasePrice: number,
  mappedTierLabel: string,
): LargeOfficePriceResult => {
  const uplifts: LargeOfficePriceUplift[] = [];

  const addUplift = (label: string, percent: number) => {
    if (percent <= 0) return;
    uplifts.push({
      amount: round2(tierBasePrice * percent / 100),
      label,
      percent,
    });
  };

  addUplift("Employee count", EMPLOYEE_UPLIFT[scope.employeeBand]);
  addUplift("Office area", AREA_UPLIFT[scope.employeeBand][scope.officeAreaSqFt]);
  addUplift("Additional floors or wings", (scope.floorsCount - 1) * 15);
  addUplift("Restrooms", RESTROOM_UPLIFT[scope.restroomBand]);

  const computedBasePrice = Math.round(
    tierBasePrice + uplifts.reduce((total, uplift) => total + uplift.amount, 0),
  );
  const scale = computedBasePrice / tierBasePrice;

  return {
    basePrice: tierBasePrice,
    computedBasePrice,
    estimatedDurationMin: Math.max(300, Math.round(300 * scale)),
    estimatedTeam: Math.max(4, Math.ceil(4 * scale)),
    mappedTierLabel,
    uplifts,
  };
};
