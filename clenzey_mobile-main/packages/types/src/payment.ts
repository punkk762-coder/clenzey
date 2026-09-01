export type PaymentOrderStatus = 'CREATED' | 'PAID' | 'FAILED';

export interface PaymentOrder {
  id: string;
  bookingId: string;
  razorpayOrderId: string;
  amount: number;
  currency: 'INR';
  status: PaymentOrderStatus;
}

export interface PaymentConfirmation {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
