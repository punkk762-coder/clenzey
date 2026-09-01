import { BadRequestError, NotFoundError } from "../../../errors/appErrors.ts";
import {
  exceedsAvailableBalance,
  payoutExceedsBalanceMessage,
  roundMoney,
} from "../../../utilities/moneyUtils.ts";
import * as repo from "./repository.ts";

export type LedgerEntryRecord = repo.LedgerEntryRecord;

export type CreateLedgerEntryInput = {
  amount: number;
  bookingId?: string | null;
  description?: string | null;
  earningDate: Date;
  metadata?: repo.LedgerEntryInsert["metadata"];
  partnerId: string;
  payrollPeriod?: string | null;
  reviewId?: string | null;
  type: "SALARY" | "SALARY_DEDUCTION" | "INCENTIVE";
};

export const createLedgerEntry = async (
  input: CreateLedgerEntryInput,
): Promise<LedgerEntryRecord> => {
  return await repo.insertLedgerEntry({
    amount: String(input.amount),
    bookingId: input.bookingId ?? null,
    description: input.description ?? null,
    earningDate: input.earningDate,
    metadata: input.metadata ?? null,
    partnerId: input.partnerId,
    payrollPeriod: input.payrollPeriod ?? null,
    reviewId: input.reviewId ?? null,
    type: input.type,
  });
};

export const getEarningsSummary = async (
  partnerId: string,
  dateRange: { from: string; to: string },
): Promise<repo.LedgerSummary> => {
  return await repo.getLedgerSummary(partnerId, {
    from: new Date(dateRange.from),
    to: new Date(dateRange.to),
  });
};

export const listEarnings = async (
  partnerId: string,
  opts: { limit?: number; offset?: number },
): Promise<{ earnings: LedgerEntryRecord[]; total: number }> => {
  const result = await repo.listLedgerEntries(partnerId, opts);
  return { earnings: result.entries, total: result.total };
};

export const getPayrollBreakdown = async (
  partnerId: string,
  payrollPeriod: string,
) => {
  return await repo.getPayrollBreakdown(partnerId, payrollPeriod);
};

export type InitiatePayoutInput = {
  adminId: string;
  amount: number;
  breakdown?: {
    deductions?: number;
    incentives?: number;
    salary?: number;
  };
  notes?: string;
  partnerId: string;
  periodEnd?: string;
  periodStart?: string;
};

export type PayoutRecord = Awaited<
  ReturnType<typeof repo.insertPayout>
>;

export const getPartnerAvailableBalance = async (
  partnerId: string,
): Promise<number> => {
  return await repo.getAvailableBalance(partnerId);
};

export const initiatePayout = async (
  input: InitiatePayoutInput,
): Promise<PayoutRecord> => {
  const payoutAmount = roundMoney(input.amount);
  if (payoutAmount <= 0) {
    throw new BadRequestError("Payout amount must be greater than zero.");
  }

  const availableBalance = await repo.getAvailableBalance(input.partnerId);
  if (exceedsAvailableBalance(payoutAmount, availableBalance)) {
    throw new BadRequestError(
      payoutExceedsBalanceMessage(payoutAmount, availableBalance),
    );
  }

  return await repo.insertPayout({
    amount: String(payoutAmount),
    breakdown: input.breakdown ?? null,
    initiatedBy: input.adminId,
    notes: input.notes ?? null,
    partnerId: input.partnerId,
    periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
    periodStart: input.periodStart ? new Date(input.periodStart) : null,
    status: "PENDING",
  });
};

export const updatePayoutStatus = async (
  payoutId: string,
  status: "PROCESSING" | "PAID" | "FAILED",
  _adminId: string,
) => {
  const paidAt = status === "PAID" ? new Date() : undefined;
  return await repo.updatePayoutStatus(payoutId, status, paidAt);
};

export const listPayouts = async (
  filters: {
    limit?: number;
    offset?: number;
    partnerId?: string;
    status?: string;
  } = {},
) => {
  return await repo.listPayouts(filters);
};

export const findIncentiveByReviewId = async (reviewId: string) => {
  return await repo.findLedgerEntryByReviewId(reviewId);
};

export const getTotalIncentives = async (from: string, to: string) => {
  return await repo.getTotalIncentivesForDateRange(new Date(from), new Date(to));
};
