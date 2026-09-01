/** Format address snapshot strings from the booking API. */
export function formatBookingAddress(snapshot: string | null | undefined): string {
  if (!snapshot?.trim()) return "—";

  try {
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;
    if (parsed && typeof parsed === "object") {
      const parts = [
        parsed.line1,
        parsed.line2,
        parsed.landmark,
        parsed.city,
        parsed.state,
        parsed.pincode,
        parsed.country,
      ]
        .filter((part) => typeof part === "string" && part.trim())
        .map((part) => (part as string).trim());

      if (parts.length > 0) return parts.join(", ");
    }
  } catch {
    // Plain string snapshot from the API.
  }

  return snapshot
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index, arr) => arr.indexOf(part) === index)
    .join(", ");
}

export function formatPaymentStatus(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
