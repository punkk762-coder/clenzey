export type DisputeCategory =
  | 'SERVICE_QUALITY'
  | 'PRICING'
  | 'DAMAGE'
  | 'NO_SHOW'
  | 'OTHER';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';

export type DisputeRaisedByType = 'CONSUMER' | 'PARTNER';

export interface Dispute {
  id: string;
  bookingId: string;
  category: DisputeCategory;
  description: string;
  raisedById: string;
  raisedByType: DisputeRaisedByType;
  status: DisputeStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeSummary {
  id: string;
  category: DisputeCategory;
  status: DisputeStatus;
  description: string;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface BookingDisputeStatus {
  canRaiseDispute: boolean;
  hasActiveDispute: boolean;
  dispute: DisputeSummary | null;
}

export interface CreateDisputePayload {
  bookingId: string;
  category: DisputeCategory;
  description: string;
}

export interface ListDisputesParams {
  status?: DisputeStatus;
  limit?: number;
  offset?: number;
}

export interface ListDisputesResponse {
  disputes: Dispute[];
  total: number;
}
