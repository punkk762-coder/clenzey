export type QuotationStatus = string;

export interface Quotation {
  id: string;
  consumerId: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  preferredTime?: string;
  serviceId?: string;
  variantId?: string;
  status: QuotationStatus;
  createdAt: string;
}
