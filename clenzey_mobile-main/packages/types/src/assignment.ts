import type { Booking } from './booking';

export type AssignmentStatus = 'PROPOSED' | 'ACCEPTED' | 'DECLINED';

export interface Assignment {
  id: string;
  bookingId: string;
  partnerId: string;
  status: AssignmentStatus;
  declineReason?: string;
  booking: Booking;
  createdAt: string;
}
