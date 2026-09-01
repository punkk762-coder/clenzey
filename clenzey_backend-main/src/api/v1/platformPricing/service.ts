import type { PlatformPricingRates } from "../bookings/pricing.ts";

import { pricingConfig } from "../../../configs/pricingConfig.ts";
import * as repo from "./repository.ts";

export type PlatformPricingSettingsRecord = repo.PlatformPricingSettingsRecord;

/**
 * Admin-facing view of the effective settings. GST and platform-fee-percent are
 * expressed as percentages (0–100), matching how they are stored and edited.
 */
export type PlatformPricingSettingsView = {
  effectiveFrom: null | string;
  gstRate: number;
  id: null | string;
  isDefault: boolean;
  platformFeeFlat: number;
  platformFeePercent: number;
};

const DEFAULT_VIEW: PlatformPricingSettingsView = {
  effectiveFrom: null,
  gstRate: pricingConfig.gstRate * 100,
  id: null,
  isDefault: true,
  platformFeeFlat: pricingConfig.platformFeeFlat,
  platformFeePercent: pricingConfig.platformFeePercent * 100,
};

const CACHE_TTL_MS = 60_000;
let ratesCache: null | { expiresAt: number; value: PlatformPricingRates } = null;

const toRates = (
  record: null | PlatformPricingSettingsRecord,
): PlatformPricingRates =>
  record
    ? {
        gstRate: parseFloat(record.gstRate) / 100,
        platformFeeFlat: parseFloat(record.platformFeeFlat),
        platformFeePercent: parseFloat(record.platformFeePercent) / 100,
      }
    : {
        gstRate: pricingConfig.gstRate,
        platformFeeFlat: pricingConfig.platformFeeFlat,
        platformFeePercent: pricingConfig.platformFeePercent,
      };

const toView = (
  record: null | PlatformPricingSettingsRecord,
): PlatformPricingSettingsView =>
  record
    ? {
        effectiveFrom: record.effectiveFrom.toISOString(),
        gstRate: parseFloat(record.gstRate),
        id: record.id,
        isDefault: false,
        platformFeeFlat: parseFloat(record.platformFeeFlat),
        platformFeePercent: parseFloat(record.platformFeePercent),
      }
    : DEFAULT_VIEW;

/**
 * Resolves the platform-wide GST / platform-fee rates used by the pricing
 * pipeline. Cached briefly to avoid a DB round-trip on every booking preview.
 * Falls back to the static defaults when nothing has been configured yet.
 */
export const resolvePlatformPricingRates =
  async (): Promise<PlatformPricingRates> => {
    if (ratesCache && ratesCache.expiresAt > Date.now()) {
      return ratesCache.value;
    }
    const record = await repo.findActiveSettings();
    const value = toRates(record);
    ratesCache = { expiresAt: Date.now() + CACHE_TTL_MS, value };
    return value;
  };

export const invalidateRatesCache = (): void => {
  ratesCache = null;
};

export const getActiveSettings =
  async (): Promise<PlatformPricingSettingsView> => {
    const record = await repo.findActiveSettings();
    return toView(record);
  };

export const listSettingsHistory = async (filter: {
  limit?: number;
  offset?: number;
}): Promise<PlatformPricingSettingsView[]> => {
  const records = await repo.listSettings(filter);
  return records.map((record) => toView(record));
};

export type UpdatePlatformPricingInput = {
  effectiveFrom?: string;
  gstRate?: number;
  platformFeeFlat?: number;
  platformFeePercent?: number;
};

/**
 * Publishes a new configuration version. Any field left unspecified inherits
 * the current effective value (or the static default when unset).
 */
export const updateSettings = async (
  input: UpdatePlatformPricingInput,
): Promise<PlatformPricingSettingsView> => {
  const current = toView(await repo.findActiveSettings());

  const record = await repo.publishSettings({
    gstRate: String(input.gstRate ?? current.gstRate),
    platformFeeFlat: String(input.platformFeeFlat ?? current.platformFeeFlat),
    platformFeePercent: String(
      input.platformFeePercent ?? current.platformFeePercent,
    ),
    ...(input.effectiveFrom && {
      effectiveFrom: new Date(input.effectiveFrom),
    }),
  });

  invalidateRatesCache();
  return toView(record);
};
