/** Extract items + total from the various paginated list shapes the backend uses. */
export function normalizePaginatedList<T>(
  payload: unknown,
  entityKeys: string[] = [],
): { items: T[]; total: number } {
  if (Array.isArray(payload)) {
    return { items: payload as T[], total: payload.length };
  }

  if (!payload || typeof payload !== "object") {
    return { items: [], total: 0 };
  }

  const obj = payload as Record<string, unknown>;
  const keys = [
    ...entityKeys,
    "items",
    "data",
    "disputes",
    "reviews",
    "payouts",
    "refunds",
    "bookings",
    "consumers",
    "partners",
    "coupons",
    "commissions",
    "runs",
    "payrollRuns",
  ];

  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) {
      const total =
        typeof obj.total === "number"
          ? obj.total
          : typeof obj.count === "number"
            ? obj.count
            : value.length;
      return { items: value as T[], total };
    }
  }

  return { items: [], total: 0 };
}

/** Unwrap `{ success, data }` API envelopes. */
export function unwrapApiData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
