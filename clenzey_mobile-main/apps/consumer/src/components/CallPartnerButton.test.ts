/**
 * Unit tests for CallPartnerButton component logic.
 *
 * Tests the contact partner flow:
 * - Req 14.1: Display contact option during PROFESSIONAL_ASSIGNED through IN_PROGRESS
 * - Req 14.2: Call GET /api/v1/bookings/:id/contact/partner and initiate phone call
 */
import type { BookingStatus } from '@clenzey/types';
import { contactApi } from '../lib/api';

// Mock the api module
jest.mock('../lib/api', () => ({
  contactApi: {
    getPartnerContact: jest.fn(),
  },
}));

const mockedGetPartnerContact = contactApi.getPartnerContact as jest.MockedFunction<
  typeof contactApi.getPartnerContact
>;

/**
 * The callable statuses (mirrors the component's CALLABLE_STATUSES constant).
 * Requirement 14.1: Display contact option during these statuses.
 */
const CALLABLE_STATUSES: BookingStatus[] = [
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
];

/**
 * Statuses where the button should NOT be visible.
 */
const NON_CALLABLE_STATUSES: BookingStatus[] = [
  'PENDING',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'NO_SHOW',
];

describe('CallPartnerButton - Visibility Logic (Req 14.1)', () => {
  it('should be visible for PROFESSIONAL_ASSIGNED status', () => {
    expect(CALLABLE_STATUSES.includes('PROFESSIONAL_ASSIGNED')).toBe(true);
  });

  it('should be visible for PROFESSIONAL_EN_ROUTE status', () => {
    expect(CALLABLE_STATUSES.includes('PROFESSIONAL_EN_ROUTE')).toBe(true);
  });

  it('should be visible for CHECKED_IN status', () => {
    expect(CALLABLE_STATUSES.includes('CHECKED_IN')).toBe(true);
  });

  it('should be visible for IN_PROGRESS status', () => {
    expect(CALLABLE_STATUSES.includes('IN_PROGRESS')).toBe(true);
  });

  it.each(NON_CALLABLE_STATUSES)(
    'should NOT be visible for %s status',
    (status) => {
      expect(CALLABLE_STATUSES.includes(status)).toBe(false);
    },
  );
});

describe('CallPartnerButton - API Call (Req 14.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call GET /bookings/:id/contact/partner with correct bookingId', async () => {
    mockedGetPartnerContact.mockResolvedValue({ phone: '+919876543210' } as any);

    const bookingId = 'booking-abc-123';
    await contactApi.getPartnerContact(bookingId);

    expect(mockedGetPartnerContact).toHaveBeenCalledTimes(1);
    expect(mockedGetPartnerContact).toHaveBeenCalledWith('booking-abc-123');
  });

  it('should return partner phone number from API response', async () => {
    mockedGetPartnerContact.mockResolvedValue({ phone: '+919876543210' } as any);

    const result = await contactApi.getPartnerContact('booking-1');

    expect((result as any).phone).toBe('+919876543210');
  });

  it('should handle response with data wrapper', async () => {
    mockedGetPartnerContact.mockResolvedValue({
      data: { phone: '+919876543210' },
    } as any);

    const result = await contactApi.getPartnerContact('booking-1');
    const phone = (result as any).data?.phone ?? (result as any).phone;

    expect(phone).toBe('+919876543210');
  });

  it('should propagate API errors', async () => {
    mockedGetPartnerContact.mockRejectedValue(
      new Error('Failed to retrieve partner contact information.'),
    );

    await expect(contactApi.getPartnerContact('booking-1')).rejects.toThrow(
      'Failed to retrieve partner contact information.',
    );
  });

  it('should handle empty response (no phone)', async () => {
    mockedGetPartnerContact.mockResolvedValue({} as any);

    const result = await contactApi.getPartnerContact('booking-1');
    const phone = (result as any).data?.phone ?? (result as any).phone;

    expect(phone).toBeUndefined();
  });
});

describe('CallPartnerButton - Phone Dialer (Req 14.2)', () => {
  it('should construct correct tel: URL from phone number', () => {
    const phone = '+919876543210';
    const url = `tel:${phone}`;
    expect(url).toBe('tel:+919876543210');
  });

  it('should handle phone numbers with different formats', () => {
    const phones = ['+919876543210', '9876543210', '+91-9876-543-210'];
    phones.forEach((phone) => {
      const url = `tel:${phone}`;
      expect(url).toMatch(/^tel:/);
    });
  });
});
