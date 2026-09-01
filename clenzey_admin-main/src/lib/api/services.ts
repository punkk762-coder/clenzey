import { api } from "./client";
import type { Service, ServiceDetail } from "@/types";

export type InclusionInput = {
  id?: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
};

export type SubVariantInput = {
  id?: string;
  label: string;
  description?: string | null;
  basePrice: number;
  discountedPrice: number;
  discountPercentage?: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder?: number;
};

export type VariantInput = {
  id?: string;
  label: string;
  value: string;
  basePrice: number;
  discountedPrice?: number;
  discountPercentage?: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder?: number;
  inclusions?: InclusionInput[];
  subVariants?: SubVariantInput[];
};

export type AddonInput = {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  discountedPrice?: number;
  discountPercentage?: number;
  sortOrder?: number;
};

export type CreateServiceInput = {
  serviceType?: "B2C" | "B2B";
  name: string;
  tagline?: string;
  description?: string;
  imageUrl?: string | null;
  sortOrder?: number;
  variants?: VariantInput[];
  addons?: AddonInput[];
  inclusions?: InclusionInput[];
};

export type ServicePatch = Partial<CreateServiceInput> & { isActive?: boolean };

export const servicesApi = {
  list: async (): Promise<Service[]> => {
    const res = await api.get<{ data: { services: Service[] } }>("/services");
    return res.data.data.services;
  },

  get: async (id: string): Promise<ServiceDetail> => {
    const res = await api.get<{ data: { service: ServiceDetail } }>(
      `/services/${id}`,
    );
    return res.data.data.service;
  },

  create: async (input: CreateServiceInput): Promise<Service> => {
    const res = await api.post<{ data: { service: Service } }>(
      "/services",
      input,
    );
    return res.data.data.service;
  },

  update: async (id: string, patch: ServicePatch): Promise<Service> => {
    const res = await api.patch<{ data: { service: Service } }>(
      `/services/${id}`,
      patch,
    );
    return res.data.data.service;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/services/${id}`);
    return res.data;
  },
};
