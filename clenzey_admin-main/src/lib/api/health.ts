import { api } from "./client";

export type HealthReadyResponse = {
  status: "ready" | "unhealthy";
  checks?: {
    database: string;
    redis: string;
  };
  timestamp: string;
};

export type HealthLiveResponse = {
  status: string;
  timestamp: string;
};

export const healthApi = {
  ready: async (): Promise<HealthReadyResponse> => {
    const res = await api.get<{ data: HealthReadyResponse }>("/health/ready");
    return res.data.data;
  },

  live: async (): Promise<HealthLiveResponse> => {
    const res = await api.get<{ data: HealthLiveResponse }>("/health/live");
    return res.data.data;
  },
};
