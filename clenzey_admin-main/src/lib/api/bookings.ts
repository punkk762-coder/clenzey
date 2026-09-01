import { api } from "./client";
import { toApiDateRange } from "./params";
import type {
  Booking,
  BookingDetail,
  BookingListFilter,
  BookingStatus,
} from "@/types";

export type { BookingListFilter } from "@/types";

export type BookingListResponse = {
  bookings: Booking[];
  total: number;
};

export type BookingExportFilter = Omit<
  BookingListFilter,
  "limit" | "offset" | "serviceId"
> & {
  /** Service UUID — backend export param is named `serviceType`. */
  serviceType?: string;
};

function toBookingListParams(
  filter: BookingListFilter = {},
): Record<string, string | number> {
  const { startDate, endDate, serviceId, partnerId, status, limit, offset } =
    filter;
  return {
    ...(status && { status }),
    ...(serviceId && { serviceId }),
    ...(partnerId && { partnerId }),
    ...(limit !== undefined && { limit }),
    ...(offset !== undefined && { offset }),
    ...toApiDateRange({ startDate, endDate }),
  };
}

function toExportParams(
  filter?: BookingExportFilter,
): Record<string, string> | undefined {
  if (!filter) return undefined;
  const { startDate, endDate, status, serviceType } = filter;
  return {
    ...(status && { status }),
    ...(serviceType && { serviceType }),
    ...toApiDateRange({ startDate, endDate }),
  };
}

export const bookingsApi = {
  list: async (filter: BookingListFilter = {}): Promise<BookingListResponse> => {
    const res = await api.get<{
      data:
        | Booking[]
        | {
            bookings: Booking[];
            total?: number;
            limit?: number;
            offset?: number;
          };
    }>("/bookings", { params: toBookingListParams(filter) });
    const d = res.data.data;
    if (Array.isArray(d)) {
      return { bookings: d, total: d.length };
    }
    const bookings = d.bookings ?? [];
    return {
      bookings,
      total: d.total ?? bookings.length,
    };
  },

  get: async (id: string): Promise<BookingDetail> => {
    const res = await api.get<{ data: { booking: BookingDetail } }>(
      `/bookings/${id}`,
    );
    const booking = res.data.data.booking;
    return {
      ...booking,
      addons: booking.addons ?? [],
      history: booking.history ?? [],
    };
  },

  transition: async (id: string, toStatus: BookingStatus, reason?: string) => {
    const res = await api.post(`/bookings/${id}/transition`, {
      toStatus,
      ...(reason && { reason }),
    });
    return res.data;
  },

  cancel: async (id: string, reason?: string) => {
    return await bookingsApi.transition(id, "CANCELLED", reason);
  },

  exportCsv: (filter?: BookingExportFilter) =>
    api.get("/admin/export/bookings", {
      params: toExportParams(filter),
      responseType: "blob",
      timeout: 30000,
    }),

  assign: (bookingId: string, partnerId: string) =>
    api.post(`/admin/bookings/${bookingId}/assign`, { partnerId }),

  listAssignablePartners: async (bookingId: string) => {
    const res = await api.get<{
      data: {
        partners: Array<{
          id: string;
          fullName: string | null;
          phone: string;
          profileImage: string | null;
          avgRating: string | null;
          totalReviews: number;
        }>;
      };
    }>(`/admin/bookings/${bookingId}/assignable-partners`);
    return (res.data.data.partners ?? []).map((partner) => ({
      id: partner.id,
      fullName: partner.fullName,
      phone: partner.phone,
      profileImage: partner.profileImage,
      approvalStatus: "APPROVED" as const,
      approvalDate: null,
      isAvailable: true,
      experienceYears: null,
      bio: null,
      languages: [],
      rating: partner.avgRating ? parseFloat(partner.avgRating) : undefined,
      createdAt: "",
      updatedAt: "",
    }));
  },
};
