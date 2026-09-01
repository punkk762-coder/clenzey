import { api } from "./client";
import { toIsoDateTime } from "./slots";
import type { Coupon } from "@/types";

function normalizeCouponPayload(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const payload = { ...input };

  for (const key of ["validFrom", "validUntil"] as const) {
    const value = payload[key];
    if (value === "" || value == null) {
      delete payload[key];
      continue;
    }
    if (typeof value === "string") {
      payload[key] = toIsoDateTime(
        value,
        key === "validUntil" ? "end" : "start",
      );
    }
  }

  return payload;
}

export const couponsApi = {
  list: async (activeOnly = false): Promise<Coupon[]> => {
    const res = await api.get<{ data: { coupons: Coupon[] } }>("/coupons", {
      params: { activeOnly },
    });
    return res.data.data.coupons ?? [];
  },

  get: async (id: string): Promise<Coupon> => {
    const res = await api.get<{ data: { coupon: Coupon } }>(`/coupons/${id}`);
    return res.data.data.coupon;
  },

  create: async (input: Record<string, unknown>) => {
    const res = await api.post("/coupons", normalizeCouponPayload(input));
    return res.data;
  },

  update: async (id: string, patch: Record<string, unknown>) => {
    const res = await api.patch(
      `/coupons/${id}`,
      normalizeCouponPayload(patch),
    );
    return res.data;
  },
};
