import { api } from "./client";
import type {
  ApprovalStatus,
  Partner,
  CommissionConfig,
} from "@/types";

export type PartnerKycDocument = {
  id: string;
  type: string;
  status: string;
  url?: string;
  uploadedAt?: string;
  rejectionReason?: string | null;
};

export type PartnerKycResponse = {
  documents: PartnerKycDocument[];
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  } | null;
};

type BackendKycDocument = {
  id: string;
  documentType?: string;
  type?: string;
  status: string;
  fileUrl?: string;
  url?: string;
  createdAt?: string;
  uploadedAt?: string;
  rejectionReason?: string | null;
};

function mapKycDocument(doc: BackendKycDocument): PartnerKycDocument {
  return {
    id: doc.id,
    type: doc.documentType ?? doc.type ?? "DOCUMENT",
    status: doc.status,
    url: doc.fileUrl ?? doc.url,
    uploadedAt: doc.createdAt ?? doc.uploadedAt,
    rejectionReason: doc.rejectionReason ?? null,
  };
}

function mapKycResponse(payload: {
  documents?: BackendKycDocument[];
  bankDetails?: PartnerKycResponse["bankDetails"];
}): PartnerKycResponse {
  return {
    documents: (payload.documents ?? []).map(mapKycDocument),
    bankDetails: payload.bankDetails ?? null,
  };
}

export const partnersApi = {
  list: async (filter: {
    approvalStatus?: ApprovalStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<Partner[]> => {
    const res = await api.get<{ data: { partners: Partner[] } }>(
      "/admin/partners",
      { params: filter },
    );
    return res.data.data.partners ?? [];
  },

  get: async (id: string): Promise<Partner> => {
    const res = await api.get<{ data: { partner: Partner } }>(
      `/admin/partners/${id}`,
    );
    return res.data.data.partner;
  },

  approve: async (id: string) => {
    const res = await api.post(`/admin/partners/${id}/approve`);
    return res.data;
  },

  reject: async (id: string, reason: string) => {
    const res = await api.post(`/admin/partners/${id}/reject`, { reason });
    return res.data;
  },

  suspend: async (id: string, reason: string) => {
    const res = await api.post(`/admin/partners/${id}/suspend`, { reason });
    return res.data;
  },

  /** Assign service skills to a partner. */
  assignSkills: (id: string, serviceIds: string[]) =>
    api.post(`/admin/partners/${id}/skills`, { serviceIds }),

  removeSkill: (partnerId: string, serviceId: string) =>
    api.delete(`/admin/partners/${partnerId}/skills/${serviceId}`),

  listBySkill: async (
    serviceId: string,
    filter: { limit?: number; offset?: number } = {},
  ): Promise<Partner[]> => {
    const res = await api.get<{ data: { partners: Partner[] } }>(
      `/admin/partners/by-skill/${serviceId}`,
      { params: filter },
    );
    return res.data.data.partners ?? [];
  },

  getKyc: async (id: string): Promise<PartnerKycResponse> => {
    const res = await api.get<{ data: PartnerKycResponse & { documents?: BackendKycDocument[] } }>(
      `/admin/partners/${id}/kyc`,
    );
    return mapKycResponse(res.data.data);
  },

  reviewKycDocument: (
    documentId: string,
    action: "APPROVE" | "REJECT",
    rejectionReason?: string,
  ) =>
    api.patch(`/admin/kyc/documents/${documentId}`, {
      action,
      ...(rejectionReason && { rejectionReason }),
    }),
};

export const commissionApi = {
  list: async (filter: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<CommissionConfig[]> => {
    const res = await api.get<{
      data: { configs: IncentiveConfigRecord[] };
    }>("/admin/incentive-configs", { params: filter });
    return (res.data.data.configs ?? []).map(mapIncentiveConfig);
  },

  create: (input: {
    percentage: number;
    serviceId?: string | null;
    effectiveFrom?: string;
    isActive?: boolean;
  }) =>
    api.post("/admin/incentive-configs", {
      percentage: input.percentage,
      serviceId: input.serviceId ?? null,
      effectiveFrom: input.effectiveFrom ?? new Date().toISOString(),
      isActive: input.isActive ?? true,
    }),

  update: (
    id: string,
    input: {
      percentage?: number;
      serviceId?: string | null;
      effectiveFrom?: string;
      isActive?: boolean;
    },
  ) => api.patch(`/admin/incentive-configs/${id}`, input),
};

type IncentiveConfigRecord = {
  id: string;
  percentage: string;
  serviceId: string | null;
  effectiveFrom: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function mapIncentiveConfig(record: IncentiveConfigRecord): CommissionConfig {
  return {
    id: record.id,
    percentage: parseFloat(record.percentage),
    minimumAmount: 0,
    serviceId: record.serviceId,
    effectiveFrom: record.effectiveFrom,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
