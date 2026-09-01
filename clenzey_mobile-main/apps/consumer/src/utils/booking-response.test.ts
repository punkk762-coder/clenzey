import {
  normalizeBooking,
  normalizePaymentOrder,
  getPaymentSummaryItems,
  getPaymentSummaryTotal,
  getTaxCalculationInfoText,
  normalizePopulatedBooking,
} from './booking-response';

describe('normalizeBooking', () => {
  const booking = {
    id: 'booking-1',
    consumerId: 'consumer-1',
    serviceId: 'service-1',
    variantId: 'variant-1',
    addressId: 'address-1',
    bookingType: 'INSTANT',
    status: 'PENDING',
    paymentMode: 'RAZORPAY',
    totalAmount: 165,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('returns plain booking objects', () => {
    expect(normalizeBooking(booking).id).toBe('booking-1');
  });

  it('unwraps nested booking objects', () => {
    expect(normalizeBooking({ booking }).id).toBe('booking-1');
  });

  it('throws when booking id is missing', () => {
    expect(() => normalizeBooking({ booking: { ...booking, id: '' } })).toThrow(
      'Booking response missing id',
    );
  });
});

describe('getPaymentSummaryItems', () => {
  it('shows API payment fields without inventing a discount', () => {
    const booking = normalizePopulatedBooking({
      id: 'booking-1',
      consumerId: 'consumer-1',
      serviceId: 'service-1',
      variantId: 'variant-1',
      addressId: 'address-1',
      bookingType: 'INSTANT',
      status: 'PENDING',
      paymentMode: 'RAZORPAY',
      subtotal: '44.00',
      addonsTotal: '15.00',
      platformFee: '19.00',
      discountAmount: '0.00',
      surgeAmount: '0.00',
      totalAmount: '78.00',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const items = getPaymentSummaryItems(booking);
    expect(items.map((item) => item.label)).toEqual(['Subtotal', 'Add-ons', 'Platform fee']);
    expect(items.some((item) => item.isDiscount)).toBe(false);
    expect(getPaymentSummaryTotal(booking)).toBe(78);
  });

  it('includes tax amount and calculation info from API fields', () => {
    const booking = normalizePopulatedBooking({
      id: 'booking-2',
      consumerId: 'consumer-1',
      serviceId: 'service-1',
      variantId: 'variant-1',
      addressId: 'address-1',
      bookingType: 'INSTANT',
      status: 'PENDING',
      paymentMode: 'RAZORPAY',
      subtotal: '44.00',
      addonsTotal: '15.00',
      platformFee: '19.00',
      taxAmount: '7.08',
      taxRate: '18',
      discountAmount: '0.00',
      surgeAmount: '0.00',
      totalAmount: '85.08',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const items = getPaymentSummaryItems(booking);
    expect(items.find((item) => item.label.startsWith('Tax'))).toEqual({
      label: 'Tax (18%)',
      amount: 7.08,
    });
    expect(getTaxCalculationInfoText(booking)).toBe('18% GST on ₹59 taxable amount = ₹7.08');
    expect(getPaymentSummaryTotal(booking)).toBe(85.08);
  });

  it('derives tax rate and taxable amount when taxRate is missing', () => {
    const booking = normalizePopulatedBooking({
      id: 'booking-4',
      consumerId: 'consumer-1',
      serviceId: 'service-1',
      variantId: 'variant-1',
      addressId: 'address-1',
      bookingType: 'INSTANT',
      status: 'PENDING',
      paymentMode: 'RAZORPAY',
      subtotal: '120.00',
      platformFee: '19.00',
      taxAmount: '21.60',
      totalAmount: '160.60',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(getTaxCalculationInfoText(booking)).toBe('18% GST on ₹120 taxable amount = ₹21.6');
    expect(getPaymentSummaryItems(booking).find((item) => item.label === 'Tax (18%)')?.amount).toBe(21.6);
  });

  it('includes surge and discount only when their amounts are greater than zero', () => {
    const booking = normalizePopulatedBooking({
      id: 'booking-3',
      consumerId: 'consumer-1',
      serviceId: 'service-1',
      variantId: 'variant-1',
      addressId: 'address-1',
      bookingType: 'INSTANT',
      status: 'PENDING',
      paymentMode: 'RAZORPAY',
      subtotal: '100.00',
      addonsTotal: '0.00',
      platformFee: '10.00',
      surgeAmount: '25.00',
      taxAmount: '0.00',
      discountAmount: '5.00',
      couponCode: 'SAVE5',
      totalAmount: '130.00',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const items = getPaymentSummaryItems(booking);
    expect(items.map((item) => item.label)).toEqual([
      'Subtotal',
      'Platform fee',
      'Surge fee',
      'Discount (SAVE5)',
    ]);
    expect(items.find((item) => item.label === 'Add-ons')).toBeUndefined();
    expect(items.find((item) => item.label === 'Surge fee')?.amount).toBe(25);
  });
});

describe('normalizePopulatedBooking reviewStatus', () => {
  const baseBooking = {
    id: 'booking-1',
    consumerId: 'consumer-1',
    serviceId: 'service-1',
    variantId: 'variant-1',
    addressId: 'address-1',
    bookingType: 'INSTANT',
    status: 'COMPLETED',
    paymentMode: 'RAZORPAY',
    totalAmount: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('parses reviewStatus when no review exists', () => {
    const booking = normalizePopulatedBooking({
      ...baseBooking,
      reviewStatus: {
        hasReview: false,
        canSubmitReview: true,
      },
    });

    expect(booking.reviewStatus).toEqual({
      hasReview: false,
      canSubmitReview: true,
      review: undefined,
    });
    expect(booking.hasReview).toBe(false);
  });

  it('parses reviewStatus when a review exists', () => {
    const booking = normalizePopulatedBooking({
      ...baseBooking,
      reviewStatus: {
        hasReview: true,
        canSubmitReview: false,
        review: {
          id: 'review-1',
          rating: 5,
          review: 'Great service!',
          createdAt: '2026-06-17T10:00:00.000Z',
        },
      },
    });

    expect(booking.reviewStatus).toEqual({
      hasReview: true,
      canSubmitReview: false,
      review: {
        id: 'review-1',
        rating: 5,
        review: 'Great service!',
        createdAt: '2026-06-17T10:00:00.000Z',
      },
    });
    expect(booking.hasReview).toBe(true);
  });

  it('unwraps reviewStatus from nested booking detail responses', () => {
    const booking = normalizePopulatedBooking({
      data: {
        booking: {
          ...baseBooking,
          reviewStatus: {
            hasReview: false,
            canSubmitReview: true,
          },
        },
      },
    });

    expect(booking.hasReview).toBe(false);
    expect(booking.reviewStatus?.canSubmitReview).toBe(true);
  });

  it('falls back to legacy hasReview fields when reviewStatus is absent', () => {
    expect(
      normalizePopulatedBooking({
        ...baseBooking,
        hasReview: true,
      }).hasReview,
    ).toBe(true);

    expect(
      normalizePopulatedBooking({
        ...baseBooking,
        review: { id: 'review-1', rating: 4 },
      }).hasReview,
    ).toBe(true);

    expect(normalizePopulatedBooking(baseBooking).hasReview).toBe(false);
  });
});

describe('normalizePopulatedBooking disputeStatus', () => {
  const baseBooking = {
    id: 'booking-1',
    consumerId: 'consumer-1',
    serviceId: 'service-1',
    variantId: 'variant-1',
    addressId: 'address-1',
    bookingType: 'INSTANT',
    status: 'COMPLETED',
    paymentMode: 'RAZORPAY',
    totalAmount: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('parses disputeStatus when consumer can raise a dispute', () => {
    const booking = normalizePopulatedBooking({
      ...baseBooking,
      disputeStatus: {
        canRaiseDispute: true,
        hasActiveDispute: false,
        dispute: null,
      },
    });

    expect(booking.disputeStatus).toEqual({
      canRaiseDispute: true,
      hasActiveDispute: false,
      dispute: null,
    });
  });

  it('parses disputeStatus when an active dispute exists', () => {
    const booking = normalizePopulatedBooking({
      ...baseBooking,
      disputeStatus: {
        canRaiseDispute: false,
        hasActiveDispute: true,
        dispute: {
          id: 'dispute-1',
          category: 'SERVICE_QUALITY',
          status: 'UNDER_REVIEW',
          description: 'The bathroom was not cleaned properly.',
          resolutionNotes: null,
          createdAt: '2026-06-17T08:30:00.000Z',
          resolvedAt: null,
        },
      },
    });

    expect(booking.disputeStatus).toEqual({
      canRaiseDispute: false,
      hasActiveDispute: true,
      dispute: {
        id: 'dispute-1',
        category: 'SERVICE_QUALITY',
        status: 'UNDER_REVIEW',
        description: 'The bathroom was not cleaned properly.',
        resolutionNotes: null,
        createdAt: '2026-06-17T08:30:00.000Z',
        resolvedAt: null,
      },
    });
  });

  it('parses disputeStatus when a dispute is resolved', () => {
    const booking = normalizePopulatedBooking({
      ...baseBooking,
      disputeStatus: {
        canRaiseDispute: false,
        hasActiveDispute: false,
        dispute: {
          id: 'dispute-1',
          category: 'PRICING',
          status: 'RESOLVED',
          description: 'I was charged incorrectly for add-on services.',
          resolutionNotes: 'A partial refund of ₹150 has been processed.',
          createdAt: '2026-06-10T14:00:00.000Z',
          resolvedAt: '2026-06-12T11:30:00.000Z',
        },
      },
    });

    expect(booking.disputeStatus?.dispute?.status).toBe('RESOLVED');
    expect(booking.disputeStatus?.dispute?.resolutionNotes).toBe(
      'A partial refund of ₹150 has been processed.',
    );
  });

  it('unwraps disputeStatus from nested booking detail responses', () => {
    const booking = normalizePopulatedBooking({
      data: {
        booking: {
          ...baseBooking,
          disputeStatus: {
            canRaiseDispute: true,
            hasActiveDispute: false,
            dispute: null,
          },
        },
      },
    });

    expect(booking.disputeStatus?.canRaiseDispute).toBe(true);
  });
});

describe('normalizePaymentOrder', () => {
  it('unwraps nested payment objects', () => {
    expect(
      normalizePaymentOrder({
        order: { id: 'order-1' },
        payment: {
          razorpayOrderId: 'order_abc',
          amount: '165',
        },
      }),
    ).toEqual({
      razorpayOrderId: 'order_abc',
      amount: 165,
    });
  });

  it('returns flat payment order objects', () => {
    expect(
      normalizePaymentOrder({
        razorpayOrderId: 'order_xyz',
        amount: 200,
      }),
    ).toEqual({
      razorpayOrderId: 'order_xyz',
      amount: 200,
    });
  });
});
