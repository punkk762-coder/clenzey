export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Partner {
  id: string;
  phone: string;
  fullName: string;
  approvalStatus: ApprovalStatus;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}
