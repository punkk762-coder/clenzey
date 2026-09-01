import { api } from "./client";
import type { AdminRole } from "@/types";

export type AdminUser = {
  id: string;
  phone: string;
  role: AdminRole;
  username: string;
};

export const adminAuth = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post<{
      data: { accessToken: string; user: AdminUser };
      success: boolean;
    }>("/admin/auth/login", credentials);
    return res.data.data;
  },

  refresh: async () => {
    const res = await api.post<{
      data: { accessToken: string };
      success: boolean;
    }>("/admin/auth/refresh");
    return res.data.data;
  },

  logout: async () => {
    await api.post("/admin/auth/logout");
  },
};
