import { api } from "./client";
import { bookingsApi } from "./bookings";
import { normalizePaginatedList } from "./normalize";
import { partnersApi } from "./partners";
import { API_MAX_PAGE_SIZE, toApiDateRange } from "./params";
import type {
  Dispute,
  DisputeCategory,
  DisputeFilter,
  DisputeListResponse,
  DisputeStatus,
} from "@/types";

export type { DisputeFilter } from "@/types";

type BackendDispute = {
  id: string;
  bookingId: string;
  category: DisputeCategory;
  status: DisputeStatus;
  description: string;
  resolutionNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  bookingNumber?: string;
  consumerName?: string | null;
  partnerName?: string | null;
};

function toIsoDate(value: string | Date | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

/** Normalize backend dispute records to the admin UI shape. */
export function mapDispute(raw: BackendDispute): Dispute {
  return {
    id: raw.id,
    bookingId: raw.bookingId,
    bookingReference:
      raw.bookingNumber?.trim() ||
      raw.bookingId.slice(0, 8).toUpperCase(),
    category: raw.category,
    status: raw.status,
    consumerName: raw.consumerName?.trim() || "Unknown customer",
    partnerName: raw.partnerName?.trim() || "Unassigned",
    description: raw.description,
    resolutionNotes: raw.resolutionNotes ?? null,
    createdAt: toIsoDate(raw.createdAt),
    updatedAt: toIsoDate(raw.updatedAt),
  };
}

async function enrichDisputeNames(disputes: Dispute[]): Promise<Dispute[]> {
  const needsBooking = disputes.some(
    (dispute) =>
      dispute.bookingReference.length <= 8 ||
      dispute.consumerName === "Unknown customer",
  );
  const needsPartner = disputes.some(
    (dispute) => dispute.partnerName === "Unassigned",
  );
  if (!needsBooking && !needsPartner) return disputes;

  const bookingIds = new Set(disputes.map((dispute) => dispute.bookingId));
  const [bookingsRes, partners] = await Promise.all([
    needsBooking ? bookingsApi.list({ limit: API_MAX_PAGE_SIZE }) : Promise.resolve(null),
    needsPartner ? partnersApi.list({ limit: 200 }) : Promise.resolve([]),
  ]);

  const bookingMap = new Map(
    (bookingsRes?.bookings ?? [])
      .filter((booking) => bookingIds.has(booking.id))
      .map((booking) => [booking.id, booking]),
  );
  const partnerMap = new Map(
    partners.map((partner) => [partner.id, partner.fullName ?? ""]),
  );

  return disputes.map((dispute) => {
    const booking = bookingMap.get(dispute.bookingId);
    return {
      ...dispute,
      bookingReference:
        dispute.bookingReference.length > 8
          ? dispute.bookingReference
          : booking?.bookingNumber ?? dispute.bookingReference,
      consumerName:
        dispute.consumerName !== "Unknown customer"
          ? dispute.consumerName
          : booking?.consumerName ?? "Unknown customer",
      partnerName:
        dispute.partnerName !== "Unassigned"
          ? dispute.partnerName
          : booking?.partnerId
            ? partnerMap.get(booking.partnerId) || "Unassigned"
            : "Unassigned",
    };
  });
}

function toDisputeListParams(filter?: DisputeFilter) {
  if (!filter) return undefined;
  const { startDate, endDate, ...rest } = filter;
  return { ...rest, ...toApiDateRange({ startDate, endDate }) };
}

/** Map UI status to a value accepted by PATCH /admin/disputes/:id. */
export function toAdminUpdateStatus(
  status: DisputeStatus,
): "UNDER_REVIEW" | "RESOLVED" | "CLOSED" {
  if (status === "OPEN") return "UNDER_REVIEW";
  return status;
}

export const disputesApi = {
  list: async (filter?: DisputeFilter): Promise<DisputeListResponse> => {
    const res = await api.get<{ data: unknown }>("/admin/disputes", {
      params: toDisputeListParams(filter),
    });
    const { items, total } = normalizePaginatedList<BackendDispute>(
      res.data.data,
      ["disputes"],
    );
    const mapped = items.map(mapDispute);
    const data = await enrichDisputeNames(mapped);
    return { data, total };
  },

  update: async (
    id: string,
    patch: { status?: DisputeStatus; resolutionNotes?: string },
  ): Promise<Dispute> => {
    const body: {
      status: "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
      resolutionNotes?: string;
    } = {
      status:
        patch.status === undefined || patch.status === "OPEN"
          ? "UNDER_REVIEW"
          : patch.status,
    };
    if (patch.resolutionNotes !== undefined) {
      body.resolutionNotes = patch.resolutionNotes;
    }

    const res = await api.patch<{ data: { dispute: BackendDispute } }>(
      `/admin/disputes/${id}`,
      body,
    );
    const [enriched] = await enrichDisputeNames([
      mapDispute(res.data.data.dispute),
    ]);
    return enriched;
  },

  get: async (id: string): Promise<Dispute> => {
    const res = await api.get<{ data: { dispute: BackendDispute } }>(
      `/admin/disputes/${id}`,
    );
    const [enriched] = await enrichDisputeNames([
      mapDispute(res.data.data.dispute),
    ]);
    return enriched;
  },

  getDetail: async (id: string) => {
    const res = await api.get<{
      data: {
        dispute: BackendDispute;
        booking: {
          id: string;
          bookingNumber: string;
          status: string;
          totalAmount: string;
          consumerName: string;
        };
        evidence: Array<{
          id: string;
          fileUrl: string;
          uploadedAt: string;
        }>;
      };
    }>(`/admin/disputes/${id}`);

    const payload = res.data.data;
    const [dispute] = await enrichDisputeNames([mapDispute(payload.dispute)]);

    return {
      dispute,
      booking: payload.booking,
      evidence: payload.evidence,
    };
  },
};
