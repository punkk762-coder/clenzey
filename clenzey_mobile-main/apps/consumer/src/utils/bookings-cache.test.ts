import { QueryClient } from '@tanstack/react-query';
import { prependBookingToBookingsCache } from './bookings-cache';

const sampleBooking = {
  id: 'booking-1',
  consumerId: 'consumer-1',
  serviceId: 'service-1',
  variantId: 'variant-1',
  addressId: 'address-1',
  bookingType: 'INSTANT' as const,
  status: 'PENDING' as const,
  paymentMode: 'RAZORPAY' as const,
  totalAmount: 499,
  createdAt: '2026-06-18T12:00:00.000Z',
  updatedAt: '2026-06-18T12:00:00.000Z',
  serviceName: 'Quick Shine',
};

describe('bookings-cache', () => {
  it('prepends a new booking to the all and active tabs', () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(['bookings', 'all'], {
      pageParams: [0],
      pages: [{ bookings: [], total: 0 }],
    });
    queryClient.setQueryData(['bookings', 'active'], {
      pageParams: [0],
      pages: [{ bookings: [], total: 0 }],
    });
    queryClient.setQueryData(['bookings', 'completed'], {
      pageParams: [0],
      pages: [{ bookings: [], total: 0 }],
    });

    prependBookingToBookingsCache(queryClient, sampleBooking);

    expect(queryClient.getQueryData(['bookings', 'all'])).toEqual({
      pageParams: [0],
      pages: [{ bookings: [expect.objectContaining({ id: 'booking-1' })], total: 1 }],
    });
    expect(queryClient.getQueryData(['bookings', 'active'])).toEqual({
      pageParams: [0],
      pages: [{ bookings: [expect.objectContaining({ id: 'booking-1' })], total: 1 }],
    });
    expect(queryClient.getQueryData(['bookings', 'completed'])).toEqual({
      pageParams: [0],
      pages: [{ bookings: [], total: 0 }],
    });
  });
});
