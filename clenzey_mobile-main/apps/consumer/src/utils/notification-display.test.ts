import {
  formatNotificationBody,
  formatNotificationTitle,
  getNotificationTone,
} from './notification-display';

describe('formatNotificationTitle', () => {
  it('formats booking status titles', () => {
    expect(formatNotificationTitle('Booking PAYMENT_PENDING')).toBe('Booking · Payment Pending');
    expect(formatNotificationTitle('Booking Cancelled')).toBe('Booking cancelled');
  });
});

describe('formatNotificationBody', () => {
  it('humanizes status codes in body text', () => {
    expect(
      formatNotificationBody(
        'Your booking BK-260617-0002 status has been updated to PAYMENT_PENDING.',
      ),
    ).toBe('Your booking BK-260617-0002 status has been updated to payment pending.');
  });
});

describe('getNotificationTone', () => {
  it('returns error for cancelled notifications', () => {
    expect(
      getNotificationTone({
        id: '1',
        title: 'Booking Cancelled',
        body: 'Cancelled',
        isRead: false,
        type: 'booking_cancelled',
        createdAt: '2026-06-17T00:00:00.000Z',
      }),
    ).toBe('error');
  });

  it('returns warning for payment pending notifications', () => {
    expect(
      getNotificationTone({
        id: '2',
        title: 'Booking PAYMENT_PENDING',
        body: 'Updated to PAYMENT_PENDING',
        isRead: false,
        type: 'booking_status_changed',
        createdAt: '2026-06-17T00:00:00.000Z',
      }),
    ).toBe('warning');
  });

  it('handles notifications without a type field', () => {
    expect(
      getNotificationTone({
        id: '3',
        title: 'Booking PAYMENT_PENDING',
        body: 'Updated to PAYMENT_PENDING',
        isRead: false,
        type: '',
        createdAt: '2026-06-17T00:00:00.000Z',
      }),
    ).toBe('warning');
  });
});
