export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function toMoneyPaise(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromMoneyPaise(paise: number): number {
  return paise / 100;
}

export function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return roundMoney(value);
  if (value == null || value === "") return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

/** Balance available for new payouts — never negative, float-safe. */
export function normalizeAvailableBalance(balance: number): number {
  const paise = toMoneyPaise(balance);
  if (paise <= 0) return 0;
  return fromMoneyPaise(paise);
}

export function exceedsAvailableBalance(
  payoutAmount: number,
  availableBalance: number,
): boolean {
  const payoutPaise = toMoneyPaise(payoutAmount);
  const availablePaise = toMoneyPaise(normalizeAvailableBalance(availableBalance));
  return payoutPaise > availablePaise;
}

export function formatInrAmount(amount: number): string {
  const normalized = roundMoney(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function payoutExceedsBalanceMessage(
  payoutAmount: number,
  availableBalance: number,
): string {
  const available = normalizeAvailableBalance(availableBalance);
  const payout = roundMoney(payoutAmount);

  if (available <= 0) {
    return "This partner has no earnings available to pay out. Record salary or incentives first, or wait until existing payouts are settled.";
  }

  return `Payout amount (${formatInrAmount(payout)}) exceeds this partner's available balance (${formatInrAmount(available)}).`;
}
