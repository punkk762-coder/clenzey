import { AxiosInstance } from 'axios';
import { Booking, BookingType, PaymentMode, SubscriptionPlan } from '@clenzey/types';

/**
 * Payload for creating a new booking.
 */
export interface CreateBookingPayload {
  serviceId: string;
  variantId: string;
  subVariantId?: string;
  addressId: string;
  bookingType: BookingType;
  scheduledAt?: string;
  timeSlotId?: string;
  addonIds?: string[];
  subscriptionPlan?: SubscriptionPlan;
  paymentMode: PaymentMode;
  couponCode?: string;
  consumerNotes?: string;
  bookingName?: string;
}

/**
 * Response from the booking preview endpoint.
 */
export interface BookingPreview {
  serviceId: string;
  variantId: string;
  subVariantId?: string;
  addonIds?: string[];
  totalAmount: number;
  breakdown: Record<string, number>;
  discount?: number;
  couponCode?: string;
}

/**
 * Parameters for listing bookings with optional filtering and pagination.
 */
export interface ListBookingsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response for booking list.
 */
export interface ListBookingsResponse {
  bookings: Booking[];
  total: number;
}

/**
 * Payload for transitioning a booking to a new status.
 */
export interface TransitionPayload {
  toStatus: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payload for rescheduling a booking.
 */
export interface ReschedulePayload {
  newScheduledAt: string;
  timeSlotId?: string;
}

export type AvailabilityPeriodName = 'MORNING' | 'AFTERNOON' | 'EVENING';

/**
 * Hourly slot returned when partner availability does not match.
 */
export interface AvailabilityHourlySlot {
  scheduledAt: string;
  available: boolean;
}

/**
 * Slots grouped by time-of-day period.
 */
export interface AvailabilityPeriodGroup {
  period: AvailabilityPeriodName;
  slots: AvailabilityHourlySlot[];
}

/**
 * Alternative slots for a single date.
 */
export interface AvailabilityAlternativeDay {
  date: string;
  periods: AvailabilityPeriodGroup[];
}

/**
 * Payload for checking partner availability before checkout.
 */
export interface CheckAvailabilityPayload {
  serviceId: string;
  variantId: string;
  scheduledAt: string;
  addressId?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Successful partner match for the requested slot.
 */
export interface AvailabilityMatchSuccess {
  matched: true;
  partnerId: string;
  distanceMeters: number;
  scheduledAt: string;
  scheduledEndAt: string;
}

/**
 * No partner match — includes alternative slots grouped by period.
 */
export interface AvailabilityMatchFailure {
  matched: false;
  reason: string;
  alternatives: AvailabilityAlternativeDay | AvailabilityAlternativeDay[];
}

export type CheckAvailabilityResponse = AvailabilityMatchSuccess | AvailabilityMatchFailure;

/**
 * Creates the bookings endpoint module.
 *
 * Provides typed methods for managing bookings:
 * - create: Create a new booking
 * - preview: Preview a booking with price breakdown
 * - list: List bookings with optional filtering and pagination
 * - getById: Get a single booking by ID
 * - cancel: Cancel a booking with optional reason
 * - transition: Transition a booking to a new status
 * - reschedule: Reschedule a booking to a new date/time
 */
export function createBookingsEndpoints(client: AxiosInstance) {
  return {
    /** POST /api/v1/bookings — Create a new booking */
    create: (data: CreateBookingPayload) =>
      client.post<Booking>('/api/v1/bookings', data),

    /** POST /api/v1/bookings/preview — Preview booking with price breakdown */
    preview: (data: CreateBookingPayload) =>
      client.post<BookingPreview>('/api/v1/bookings/preview', data),

    /** GET /api/v1/bookings — List bookings with optional filters */
    list: (params?: ListBookingsParams) =>
      client.get<ListBookingsResponse>('/api/v1/bookings', { params }),

    /** GET /api/v1/bookings/:bookingId — Get a single booking */
    getById: (bookingId: string) =>
      client.get<Booking>(`/api/v1/bookings/${bookingId}`),

    /** POST /api/v1/bookings/:bookingId/cancel — Cancel a booking */
    cancel: (bookingId: string, reason?: string) =>
      client.post<Booking>(`/api/v1/bookings/${bookingId}/cancel`, { reason }),

    /** POST /api/v1/bookings/:bookingId/transition — Transition booking status */
    transition: (bookingId: string, data: TransitionPayload) =>
      client.post<Booking>(`/api/v1/bookings/${bookingId}/transition`, data),

    /** POST /api/v1/bookings/:bookingId/reschedule — Reschedule a booking */
    reschedule: (bookingId: string, data: ReschedulePayload) =>
      client.post<Booking>(`/api/v1/bookings/${bookingId}/reschedule`, data),

    /** POST /api/v1/bookings/availability/check — Check partner availability for a slot */
    checkAvailability: (data: CheckAvailabilityPayload) =>
      client.post<CheckAvailabilityResponse>('/api/v1/bookings/availability/check', data),
  };
}
