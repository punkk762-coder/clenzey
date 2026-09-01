import { NotFoundError } from "../../../errors/appErrors.ts";
import { calculateIncentiveAmount } from "../../../utilities/payrollUtils.ts";
import * as repo from "./repository.ts";

export type IncentiveConfigRecord = repo.IncentiveConfigRecord;

const FALLBACK_INCENTIVE_PERCENTAGE = 20;

export const calculateIncentive = (
  subtotal: number,
  config: { percentage: number } | null,
): number => {
  const percentage = config?.percentage ?? FALLBACK_INCENTIVE_PERCENTAGE;
  return calculateIncentiveAmount(subtotal, percentage);
};

export const resolveIncentiveConfig = async (
  serviceId: string,
): Promise<IncentiveConfigRecord | null> => {
  const serviceConfig = await repo.findActiveConfigByServiceId(serviceId);
  if (serviceConfig) return serviceConfig;
  return await repo.findActiveGlobalConfig();
};

export const resolveIncentivePercentage = async (
  serviceId: string,
): Promise<number> => {
  const config = await resolveIncentiveConfig(serviceId);
  return config ? parseFloat(config.percentage) : FALLBACK_INCENTIVE_PERCENTAGE;
};

export type CreateIncentiveConfigInput = {
  effectiveFrom: string;
  isActive?: boolean;
  percentage: number;
  serviceId?: string | null;
};

export const createConfig = async (input: CreateIncentiveConfigInput) => {
  return await repo.insertConfig({
    effectiveFrom: new Date(input.effectiveFrom),
    isActive: input.isActive ?? true,
    percentage: String(input.percentage),
    serviceId: input.serviceId ?? null,
  });
};

export type UpdateIncentiveConfigInput = {
  effectiveFrom?: string;
  isActive?: boolean;
  percentage?: number;
  serviceId?: string | null;
};

export const updateConfig = async (
  id: string,
  input: UpdateIncentiveConfigInput,
) => {
  const existing = await repo.findConfigById(id);
  if (!existing) throw new NotFoundError("Incentive config not found.");

  const patch: Partial<repo.IncentiveConfigInsert> = {};
  if (input.percentage !== undefined) patch.percentage = String(input.percentage);
  if (input.effectiveFrom !== undefined)
    patch.effectiveFrom = new Date(input.effectiveFrom);
  if (input.serviceId !== undefined) patch.serviceId = input.serviceId;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  return await repo.updateConfig(id, patch);
};

export const listConfigs = async (
  filter: { activeOnly?: boolean; limit?: number; offset?: number } = {},
) => {
  return await repo.listConfigs(filter);
};

export const getConfigById = async (id: string) => {
  const config = await repo.findConfigById(id);
  if (!config) throw new NotFoundError("Incentive config not found.");
  return config;
};

export const creditFiveStarIncentive = async (input: {
  bookingId: string;
  partnerId: string;
  reviewId: string;
  serviceId: string;
  subtotal: number;
}) => {
  const percentage = await resolveIncentivePercentage(input.serviceId);
  const amount = calculateIncentive(input.subtotal, { percentage });

  const { createLedgerEntry } = await import("../earnings/service.ts");
  return await createLedgerEntry({
    amount,
    bookingId: input.bookingId,
    description: "5-star review incentive",
    earningDate: new Date(),
    metadata: {
      incentivePct: percentage,
      subtotal: input.subtotal,
    },
    partnerId: input.partnerId,
    reviewId: input.reviewId,
    type: "INCENTIVE",
  });
};
