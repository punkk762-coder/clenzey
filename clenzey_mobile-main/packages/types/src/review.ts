export interface Review {
  id: string;
  bookingId: string;
  consumerId: string;
  partnerId: string;
  rating: number;
  review?: string;
  createdAt: string;
}
