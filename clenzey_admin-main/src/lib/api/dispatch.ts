import { api } from "./client";

export type FailedDispatchJob = {
  id: string;
  queue: string;
  name: string;
  bookingId: string | null;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: string | null;
  finishedOn: string | null;
};

export type EscalatedBooking = {
  bookingId: string;
  bookingNumber: string;
  bookingType: string;
  consumerId: string;
  escalatedAt: string;
  scheduledAt: string | null;
  serviceName: string;
  status: string;
};

export type DispatchTriggerResult = {
  bookingId?: string;
  jobId: string;
  queued: boolean;
  queue: string;
  syncResult?: unknown;
};

export const dispatchApi = {
  listFailedJobs: async (params?: {
    limit?: number;
    offset?: number;
    queue?: string;
  }) => {
    const res = await api.get<{
      data: { jobs: FailedDispatchJob[]; total: number };
    }>("/admin/dispatch/jobs/failed", { params });
    return res.data.data;
  },

  retryFailedJob: async (queueName: string, jobId: string) => {
    const res = await api.post<{ data: { job: FailedDispatchJob } }>(
      `/admin/dispatch/jobs/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/retry`,
    );
    return res.data.data.job;
  },

  listEscalated: async () => {
    const res = await api.get<{ data: { bookings: EscalatedBooking[] } }>(
      "/admin/dispatch/escalated",
    );
    return res.data.data.bookings;
  },

  triggerInstant: async (bookingId: string, sync = false) => {
    const res = await api.post<{ data: DispatchTriggerResult }>(
      `/admin/dispatch/bookings/${bookingId}/instant`,
      {},
      { params: sync ? { sync: "true" } : undefined },
    );
    return res.data.data;
  },

  triggerRedispatch: async (
    bookingId: string,
    opts?: { radiusMeters?: number; sync?: boolean },
  ) => {
    const res = await api.post<{ data: DispatchTriggerResult }>(
      `/admin/dispatch/bookings/${bookingId}/redispatch`,
      {
        ...(opts?.radiusMeters !== undefined
          ? { radiusMeters: opts.radiusMeters }
          : {}),
      },
      { params: opts?.sync ? { sync: "true" } : undefined },
    );
    return res.data.data;
  },

  triggerScheduledAssign: async (bookingId: string, sync = false) => {
    const res = await api.post<{ data: DispatchTriggerResult }>(
      `/admin/dispatch/bookings/${bookingId}/scheduled-assign`,
      {},
      { params: sync ? { sync: "true" } : undefined },
    );
    return res.data.data;
  },

  triggerRevalidate: async (bookingId: string, sync = false) => {
    const res = await api.post<{ data: DispatchTriggerResult }>(
      `/admin/dispatch/bookings/${bookingId}/revalidate`,
      {},
      { params: sync ? { sync: "true" } : undefined },
    );
    return res.data.data;
  },

  runScheduledBatch: async (sync = false) => {
    const res = await api.post<{ data: DispatchTriggerResult }>(
      "/admin/dispatch/scheduled-batch/run",
      {},
      { params: sync ? { sync: "true" } : undefined },
    );
    return res.data.data;
  },
};
