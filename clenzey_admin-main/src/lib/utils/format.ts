import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export const inr = (value: number | string | null | undefined): string => {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

export const compact = (n: number | string | null | undefined): string => {
  const value = typeof n === "string" ? parseFloat(n) : n;
  if (value == null || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatNumber = (n: number | string | null | undefined): string => {
  const value = typeof n === "string" ? parseFloat(n) : n;
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
};

export const formatCurrency = (n: number | string | null | undefined): string => {
  const value = typeof n === "string" ? parseFloat(n) : n;
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

export const pct = (n: number, digits = 1): string => `${(n * 100).toFixed(digits)}%`;

export const dateTime = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  if (isToday(date)) return `Today · ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Yesterday · ${format(date, "HH:mm")}`;
  return format(date, "dd MMM · HH:mm");
};

export const dateShort = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy");
};

export const timeAgo = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
};

export const initials = (name?: null | string): string => {
  if (!name) return "··";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};

export const maskPhone = (phone: string): string => {
  if (!phone) return "";
  const tail = phone.slice(-4);
  return phone.slice(0, phone.length - 4).replace(/\d/g, "•") + tail;
};

export const maskAccountNumber = (account?: string | null): string => {
  if (!account) return "—";
  if (account.length <= 4) return account;
  return "•".repeat(Math.min(account.length - 4, 8)) + account.slice(-4);
};

export const formatPartnerRef = (id: string): string => {
  const suffix = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `#PRT-${suffix}`;
};
