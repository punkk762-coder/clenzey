import { api } from "./client";
import type { Quotation } from "@/types";

export const quotationsApi = {
  list: async (filter: {
    status?: Quotation["status"];
    limit?: number;
    offset?: number;
  } = {}): Promise<Quotation[]> => {
    const res = await api.get<{ data: { quotations: Quotation[] } }>(
      "/admin/quotations",
      { params: filter },
    );
    return res.data.data.quotations ?? [];
  },

  updateStatus: async (
    id: string,
    status: Quotation["status"],
    quotedAmount?: number,
  ): Promise<Quotation> => {
    const res = await api.patch<{ data: { quotation: Quotation } }>(
      `/admin/quotations/${id}`,
      { status, ...(quotedAmount !== undefined && { quotedAmount }) },
    );
    return res.data.data.quotation;
  },
};
