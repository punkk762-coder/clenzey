import { api } from "./client";
import type { Booking, Consumer, ConsumerAddress } from "@/types";

export const customersApi = {
  list: async (filter: {
    query?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Consumer[]> => {
    const res = await api.get<{ data: { consumers: Consumer[] } }>(
      "/admin/consumers",
      { params: filter },
    );
    return res.data.data.consumers ?? [];
  },

  get: async (id: string): Promise<Consumer> => {
    const res = await api.get<{ data: { consumer: Consumer } }>(
      `/admin/consumers/${id}`,
    );
    return res.data.data.consumer;
  },

  setActive: async (id: string, isActive: boolean) => {
    const res = await api.patch(`/admin/consumers/${id}`, { isActive });
    return res.data;
  },

  getAddresses: async (id: string): Promise<ConsumerAddress[]> => {
    const res = await api.get<{ data: { addresses: ConsumerAddress[] } }>(
      `/admin/consumers/${id}/addresses`,
    );
    return res.data.data.addresses ?? [];
  },

  getBookings: async (
    consumerId: string,
    limit = 50,
    offset = 0,
  ): Promise<Booking[]> => {
    const res = await api.get<{ data: { bookings: Booking[] } }>(
      `/admin/consumers/${consumerId}/bookings`,
      { params: { limit, offset } },
    );
    return res.data.data.bookings ?? [];
  },
};
