import { getBookingStatusLabel } from './booking-status';

describe('getBookingStatusLabel', () => {
  it('returns full status labels without abbreviations', () => {
    expect(getBookingStatusLabel('PROFESSIONAL_ASSIGNED')).toBe('Professional Assigned');
    expect(getBookingStatusLabel('PROFESSIONAL_EN_ROUTE')).toBe('Professional En Route');
    expect(getBookingStatusLabel('PAYMENT_PENDING')).toBe('Payment Pending');
  });
});
