import { normalizeNotificationsListResponse } from './notification-response';

describe('normalizeNotificationsListResponse', () => {
  const notification = {
    id: 'notif-1',
    title: 'Booking confirmed',
    body: 'Your booking is confirmed.',
    isRead: false,
    type: 'booking_confirmed',
    createdAt: '2026-06-17T10:00:00.000Z',
  };

  it('returns plain notification arrays', () => {
    expect(normalizeNotificationsListResponse([notification])).toEqual({
      notifications: [notification],
      total: 1,
      unreadCount: undefined,
    });
  });

  it('unwraps paginated notifications responses', () => {
    expect(
      normalizeNotificationsListResponse({
        notifications: [notification],
        total: 12,
        unreadCount: 3,
      }),
    ).toEqual({
      notifications: [notification],
      total: 12,
      unreadCount: 3,
    });
  });

  it('supports legacy data arrays', () => {
    expect(
      normalizeNotificationsListResponse({
        data: [notification],
      }),
    ).toEqual({
      notifications: [notification],
      total: 1,
      unreadCount: undefined,
    });
  });

  it('returns an empty list for invalid responses', () => {
    expect(normalizeNotificationsListResponse(null)).toEqual({
      notifications: [],
      total: 0,
      unreadCount: undefined,
    });
  });

  it('fills defaults for notifications missing optional fields', () => {
    const [normalized] = normalizeNotificationsListResponse([
      {
        id: 'notif-2',
        title: 'Booking PAYMENT_PENDING',
        body: 'Updated',
        isRead: false,
        createdAt: '2026-06-17T10:00:00.000Z',
      },
    ]).notifications;

    expect(normalized).toMatchObject({
      id: 'notif-2',
      title: 'Booking PAYMENT_PENDING',
      body: 'Updated',
      isRead: false,
      type: '',
    });
  });
});
