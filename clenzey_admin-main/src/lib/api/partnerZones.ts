import { api } from "./client";

export type PartnerZone = {
  partnerId: string;
  zoneId: string;
  isPrimary: boolean;
  zoneName: string;
  zoneSlug: string;
  zoneCity: string;
};

export const partnerZonesApi = {
  list: async (partnerId: string): Promise<PartnerZone[]> => {
    const res = await api.get<{ data: { zones: PartnerZone[] } }>(
      `/admin/partners/${partnerId}/zones`,
    );
    return res.data.data.zones;
  },

  assign: async (
    partnerId: string,
    zoneIds: string[],
    primaryZoneId?: string,
  ) => {
    const res = await api.post<{ data: { zones: PartnerZone[] } }>(
      `/admin/partners/${partnerId}/zones`,
      { zoneIds, ...(primaryZoneId ? { primaryZoneId } : {}) },
    );
    return res.data.data.zones;
  },

  remove: async (partnerId: string, zoneId: string) => {
    await api.delete(`/admin/partners/${partnerId}/zones/${zoneId}`);
  },

  setPrimary: async (partnerId: string, zoneId: string) => {
    const res = await api.patch<{ data: { primaryZoneId: string } }>(
      `/admin/partners/${partnerId}/zones/${zoneId}/primary`,
    );
    return res.data.data.primaryZoneId;
  },

  updateBaseLocation: async (
    partnerId: string,
    latitude: number,
    longitude: number,
  ) => {
    await api.patch(`/admin/partners/${partnerId}/base-location`, {
      latitude,
      longitude,
    });
  },
};
