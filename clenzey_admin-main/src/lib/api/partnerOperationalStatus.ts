import { api } from "./client";

export type PartnerOperationalStatus =
  | "OFFLINE"
  | "IDLE"
  | "IN_TRANSIT"
  | "ON_JOB";

export type PartnerOperationalSnapshot = {
  partnerId: string;
  fullName: string | null;
  status: PartnerOperationalStatus;
  isOnline: boolean;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  activeBookingId: string | null;
  activeBookingNumber: string | null;
  activeBookingStatus: string | null;
  timestamp: string;
};

export const partnerOperationalStatusApi = {
  list: async (params: { limit?: number; offset?: number } = {}): Promise<{
    partners: PartnerOperationalSnapshot[];
    total: number;
  }> => {
    const res = await api.get<{
      data: {
        partners: PartnerOperationalSnapshot[];
        total: number;
      };
    }>("/admin/partners/operational-status", { params });
    return {
      partners: res.data.data.partners ?? [],
      total: res.data.data.total ?? 0,
    };
  },

  get: async (partnerId: string): Promise<PartnerOperationalSnapshot> => {
    const res = await api.get<{ data: { partner: PartnerOperationalSnapshot } }>(
      `/admin/partners/${partnerId}/operational-status`,
    );
    return res.data.data.partner;
  },
};
