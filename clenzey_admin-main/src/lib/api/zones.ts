import { api } from "./client";
import type { Zone, ZoneStatus, ZoneTier } from "@/types";

export type ZoneInput = {
  name: string;
  slug: string;
  description?: string;
  city: string;
  state: string;
  country?: string;
  status?: ZoneStatus;
  tier?: ZoneTier;
  priority?: number;
  centerLat?: number;
  centerLng?: number;
  boundary: number[][][][];
  serviceIds?: string[];
};

export const zonesApi = {
  list: async (filter: {
    city?: string;
    status?: ZoneStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<Zone[]> => {
    const res = await api.get<{ data: { zones: Zone[] } }>("/admin/zones", {
      params: filter,
    });
    return res.data.data.zones;
  },

  get: async (id: string): Promise<Zone> => {
    const res = await api.get<{ data: { zone: Zone } }>(`/admin/zones/${id}`);
    return res.data.data.zone;
  },

  create: async (input: ZoneInput): Promise<Zone> => {
    const res = await api.post<{ data: { zone: Zone } }>("/admin/zones", input);
    return res.data.data.zone;
  },

  update: async (id: string, patch: Partial<ZoneInput>): Promise<Zone> => {
    const res = await api.patch<{ data: { zone: Zone } }>(
      `/admin/zones/${id}`,
      patch,
    );
    return res.data.data.zone;
  },

  remove: async (id: string) => {
    await api.delete(`/admin/zones/${id}`);
  },

  checkServiceability: async (
    latitude: number,
    longitude: number,
    serviceId?: string,
  ) => {
    const res = await api.get<{
      data: {
        serviceability: {
          isServiceable: boolean;
          reason?: string;
          zone?: { id: string; name: string; tier: string };
        };
      };
    }>("/location/serviceability", {
      params: { latitude, longitude, ...(serviceId && { serviceId }) },
    });
    return res.data.data.serviceability;
  },
};
