/**
 * Formats a phone number for MSG91 by stripping all non-digit characters.
 * MSG91 expects digits-only with country code (no "+" prefix).
 * E.g., "+91 9876-543210" → "919876543210"
 */
export function formatPhoneForMsg91(phone: string): string {
  return phone.replace(/\D/g, "");
}
