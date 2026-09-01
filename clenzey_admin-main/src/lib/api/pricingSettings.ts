import { api } from "./client";
import { toIsoDateTime } from "./slots";

export type PlatformPricingSettings = {
  effectiveFrom: null | string;
  gstRate: number;
  id: null | string;
  isDefault: boolean;
  platformFeeFlat: number;
  platformFeePercent: number;
};

type BackendPlatformPricingSettings = {
  effectiveFrom?: null | string;
  gstRate: number | string;
  id?: null | string;
  isDefault?: boolean;
  platformFeeFlat: number | string;
  platformFeePercent: number | string;
};

function toNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function toIsoDate(value: null | string | undefined): null | string {
  if (!value) return null;
  return value;
}

/** Normalize backend platform pricing settings to the admin UI shape. */
export function mapPlatformPricingSettings(
  raw: BackendPlatformPricingSettings,
): PlatformPricingSettings {
  return {
    effectiveFrom: toIsoDate(raw.effectiveFrom),
    gstRate: toNumber(raw.gstRate),
    id: raw.id ?? null,
    isDefault: raw.isDefault ?? false,
    platformFeeFlat: toNumber(raw.platformFeeFlat),
    platformFeePercent: toNumber(raw.platformFeePercent),
  };
}

export type UpdatePlatformPricingInput = {
  effectiveFrom?: string;
  gstRate?: number;
  platformFeeFlat?: number;
  platformFeePercent?: number;
};

export const pricingSettingsApi = {
  get: async (): Promise<PlatformPricingSettings> => {
    const res = await api.get<{ data: { settings: BackendPlatformPricingSettings } }>(
      "/admin/pricing-settings",
    );
    return mapPlatformPricingSettings(res.data.data.settings);
  },

  update: async (
    input: UpdatePlatformPricingInput,
  ): Promise<PlatformPricingSettings> => {
    const payload: UpdatePlatformPricingInput = { ...input };
    if (payload.effectiveFrom) {
      payload.effectiveFrom = toIsoDateTime(payload.effectiveFrom, "start");
    }

    const res = await api.put<{ data: { settings: BackendPlatformPricingSettings } }>(
      "/admin/pricing-settings",
      payload,
    );
    return mapPlatformPricingSettings(res.data.data.settings);
  },

  history: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<PlatformPricingSettings[]> => {
    const res = await api.get<{ data: { history: BackendPlatformPricingSettings[] } }>(
      "/admin/pricing-settings/history",
      { params },
    );
    return res.data.data.history.map(mapPlatformPricingSettings);
  },
};
