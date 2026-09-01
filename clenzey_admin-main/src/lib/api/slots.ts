import { api } from "./client";

export type TimeSlot = {
  id: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  reservedCount: number;
  isActive: boolean;
};

export type GenerateSlotsInput = {
  serviceId: string;
  fromDate: string;
  toDate: string;
  startHour: number;
  endHour: number;
  slotDurationMin: number;
  capacity: number;
};

/** Convert a date (`YYYY-MM-DD`) or datetime-local value to ISO-8601 UTC. */
export function toIsoDateTime(
  value: string,
  boundary: "start" | "end" = "start",
): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const suffix = boundary === "end" ? "T23:59:59.999" : "T00:00:00.000";
    return new Date(`${trimmed}${suffix}`).toISOString();
  }

  const normalized =
    trimmed.length === 16 && trimmed.includes("T")
      ? `${trimmed}:00`
      : trimmed;
  return new Date(normalized).toISOString();
}

export const slotsApi = {
  listAdmin: async (filter: {
    serviceId: string;
    fromAt: string;
    toAt: string;
  }): Promise<TimeSlot[]> => {
    const res = await api.get<{ data: { slots: TimeSlot[] } | TimeSlot[] }>(
      "/slots/admin",
      {
        params: {
          serviceId: filter.serviceId,
          fromAt: toIsoDateTime(filter.fromAt, "start"),
          toAt: toIsoDateTime(filter.toAt, "end"),
        },
      },
    );
    const d = res.data.data;
    return Array.isArray(d) ? d : (d.slots ?? []);
  },

  generate: (input: GenerateSlotsInput) =>
    api.post<{ data: { generated: number; skipped: number } }>(
      "/slots/generate",
      input,
    ),

  updateCapacity: (slotId: string, capacity: number) =>
    api.patch(`/slots/${slotId}/capacity`, { capacity }),
};
