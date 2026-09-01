import { api } from "./client";

export type ZonePriceOverride = {
  id: string;
  zoneId: string;
  serviceId: string;
  variantId: string;
  overridePrice: string;
  createdAt: string;
  updatedAt: string;
  serviceName?: string;
  variantLabel?: string;
};

export const zonePricingApi = {
  list: async (zoneId: string): Promise<ZonePriceOverride[]> => {
    const res = await api.get<{ data: { overrides: ZonePriceOverride[] } }>(
      `/admin/zones/${zoneId}/price-overrides`,
    );
    return res.data.data.overrides;
  },

  create: async (
    zoneId: string,
    input: { serviceId: string; variantId: string; overridePrice: number },
  ) => {
    const res = await api.post<{ data: { override: ZonePriceOverride } }>(
      `/admin/zones/${zoneId}/price-overrides`,
      input,
    );
    return res.data.data.override;
  },

  update: async (
    zoneId: string,
    overrideId: string,
    overridePrice: number,
  ) => {
    const res = await api.put<{ data: { override: ZonePriceOverride } }>(
      `/admin/zones/${zoneId}/price-overrides/${overrideId}`,
      { overridePrice },
    );
    return res.data.data.override;
  },

  remove: async (zoneId: string, overrideId: string) => {
    await api.delete(`/admin/zones/${zoneId}/price-overrides/${overrideId}`);
  },
};
