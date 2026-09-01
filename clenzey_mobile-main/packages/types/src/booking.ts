export type BookingStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PROFESSIONAL_ASSIGNED'
  | 'PROFESSIONAL_EN_ROUTE'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'NO_SHOW';

export type BookingType = 'INSTANT' | 'SCHEDULED';

export type PaymentMode = 'RAZORPAY' | 'CASH';

export type SubscriptionPlan = 'ONE_TIME' | 'WEEKLY' | 'MONTHLY';

export interface Booking {
  id: string;
  consumerId: string;
  serviceId: string;
  variantId: string;
  subVariantId?: string;
  addressId: string;
  bookingType: BookingType;
  scheduledAt?: string;
  timeSlotId?: string;
  status: BookingStatus;
  paymentMode: PaymentMode;
  couponCode?: string;
  consumerNotes?: string;
  bookingName?: string;
  addonIds?: string[];
  subscriptionPlan?: SubscriptionPlan;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}
