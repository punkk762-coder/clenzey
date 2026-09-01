import type { Booking, BookingStatus, BookingDisputeStatus, DisputeCategory, DisputeStatus } from '@clenzey/types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function parseAmount(value?: number | string | null): number {
  if (value == null || value === '') return 0;
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(num) ? num : 0;
}

function unwrapBookingRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) {
    throw new Error('Invalid booking response');
  }

  if (asRecord(record.booking)) {
    return asRecord(record.booking)!;
  }

  if (asRecord(record.data)) {
    const data = asRecord(record.data)!;
    return asRecord(data.booking) ?? data;
  }

  return record;
}

export interface PopulatedBooking extends Booking {
  serviceName?: string;
  bookingNumber?: string;
  addressSnapshot?: string;
  paymentStatus?: string;
  consumerName?: string;
  consumerPhone?: string;
  subtotal?: number;
  platformFee?: number;
  addonsTotal?: number;
  surgeAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxableAmount?: number;
  basePrice?: number;
  breakdown?: Record<string, number>;
  service?: {
    name: string;
    category?: string;
  };
  variant?: {
    name: string;
    duration?: number;
    price?: number;
  };
  addons?: Array<{ id: string; name: string; price?: number }>;
  partner?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  address?: {
    label?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  statusHistory?: Array<{
    status: BookingStatus;
    timestamp: string;
    reason?: string;
  }>;
  reviewStatus?: BookingReviewStatus;
  hasReview?: boolean;
  disputeStatus?: BookingDisputeStatus;
}

export interface BookingReviewSummary {
  id: string;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface BookingReviewStatus {
  hasReview: boolean;
  canSubmitReview?: boolean;
  review?: BookingReviewSummary;
}

/**
 * Normalizes booking create/get API responses.
 * Supports `{ booking: Booking }`, `{ data: { booking } }`, and plain `Booking`.
 */
export function normalizeBooking(value: unknown): Booking {
  const bookingRecord = unwrapBookingRecord(value);

  const id = String(bookingRecord.id ?? bookingRecord.bookingId ?? '');
  if (!id) {
    throw new Error('Booking response missing id');
  }

  return {
    id,
    consumerId: String(bookingRecord.consumerId ?? ''),
    serviceId: String(bookingRecord.serviceId ?? ''),
    variantId: String(bookingRecord.variantId ?? ''),
    subVariantId: bookingRecord.subVariantId ? String(bookingRecord.subVariantId) : undefined,
    addressId: String(bookingRecord.addressId ?? ''),
    bookingType: (bookingRecord.bookingType as Booking['bookingType']) ?? 'INSTANT',
    scheduledAt: bookingRecord.scheduledAt ? String(bookingRecord.scheduledAt) : undefined,
    timeSlotId: bookingRecord.timeSlotId ? String(bookingRecord.timeSlotId) : undefined,
    status: (bookingRecord.status as Booking['status']) ?? 'PENDING',
    paymentMode: (bookingRecord.paymentMode as Booking['paymentMode']) ?? 'RAZORPAY',
    couponCode: bookingRecord.couponCode ? String(bookingRecord.couponCode) : undefined,
    consumerNotes: bookingRecord.consumerNotes ? String(bookingRecord.consumerNotes) : undefined,
    bookingName: bookingRecord.bookingName ? String(bookingRecord.bookingName) : undefined,
    addonIds: Array.isArray(bookingRecord.addonIds)
      ? bookingRecord.addonIds.map(String)
      : undefined,
    subscriptionPlan: bookingRecord.subscriptionPlan as Booking['subscriptionPlan'],
    totalAmount: parseAmount(bookingRecord.totalAmount as number | string | undefined),
    createdAt: String(bookingRecord.createdAt ?? ''),
    updatedAt: String(bookingRecord.updatedAt ?? ''),
  };
}

/**
 * Normalizes booking detail responses with populated API fields.
 */
export function normalizePopulatedBooking(value: unknown): PopulatedBooking {
  const bookingRecord = unwrapBookingRecord(value);
  const base = normalizeBooking(bookingRecord);

  return {
    ...base,
    serviceName: bookingRecord.serviceName ? String(bookingRecord.serviceName) : undefined,
    bookingNumber: bookingRecord.bookingNumber ? String(bookingRecord.bookingNumber) : undefined,
    addressSnapshot: bookingRecord.addressSnapshot ? String(bookingRecord.addressSnapshot) : undefined,
    paymentStatus: bookingRecord.paymentStatus ? String(bookingRecord.paymentStatus) : undefined,
    consumerName: bookingRecord.consumerName ? String(bookingRecord.consumerName) : undefined,
    consumerPhone: bookingRecord.consumerPhone ? String(bookingRecord.consumerPhone) : undefined,
    subtotal: parseAmount(bookingRecord.subtotal as number | string | undefined),
    platformFee: parseAmount(bookingRecord.platformFee as number | string | undefined),
    addonsTotal: parseAmount(bookingRecord.addonsTotal as number | string | undefined),
    surgeAmount: parseAmount(bookingRecord.surgeAmount as number | string | undefined),
    discountAmount: parseAmount(
      (bookingRecord.discountAmount ?? bookingRecord.discount) as number | string | undefined,
    ),
    taxAmount: parseAmount(
      (bookingRecord.taxAmount ?? bookingRecord.tax ?? bookingRecord.gstAmount) as
        | number
        | string
        | undefined,
    ),
    taxRate: parseTaxRate(
      (bookingRecord.taxRate ??
        bookingRecord.gstRate ??
        bookingRecord.taxPercentage ??
        bookingRecord.gstPercentage) as number | string | undefined,
    ),
    taxableAmount: parseAmount(bookingRecord.taxableAmount as number | string | undefined),
    basePrice: parseAmount(bookingRecord.basePrice as number | string | undefined),
    breakdown: parseBreakdown(bookingRecord.breakdown),
    service: bookingRecord.service as PopulatedBooking['service'],
    variant: bookingRecord.variant as PopulatedBooking['variant'],
    addons: bookingRecord.addons as PopulatedBooking['addons'],
    partner: bookingRecord.partner as PopulatedBooking['partner'],
    address: bookingRecord.address as PopulatedBooking['address'],
    statusHistory: bookingRecord.statusHistory as PopulatedBooking['statusHistory'],
    reviewStatus: parseReviewStatus(bookingRecord),
    hasReview: getHasReview(bookingRecord),
    disputeStatus: parseDisputeStatus(bookingRecord),
  };
}

function parseReviewStatus(record: Record<string, unknown>): BookingReviewStatus | undefined {
  const reviewStatus = asRecord(record.reviewStatus);
  if (!reviewStatus) {
    return undefined;
  }

  const review = asRecord(reviewStatus.review);

  return {
    hasReview: reviewStatus.hasReview === true,
    canSubmitReview:
      reviewStatus.canSubmitReview === true
        ? true
        : reviewStatus.canSubmitReview === false
          ? false
          : undefined,
    review: review
      ? {
          id: String(review.id ?? ''),
          rating: Number(review.rating ?? 0),
          review: review.review ? String(review.review) : undefined,
          createdAt: String(review.createdAt ?? ''),
        }
      : undefined,
  };
}

const DISPUTE_CATEGORIES: DisputeCategory[] = [
  'SERVICE_QUALITY',
  'PRICING',
  'DAMAGE',
  'NO_SHOW',
  'OTHER',
];

const DISPUTE_STATUSES: DisputeStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

function parseDisputeCategory(value: unknown): DisputeCategory {
  const category = String(value ?? 'OTHER');
  return DISPUTE_CATEGORIES.includes(category as DisputeCategory)
    ? (category as DisputeCategory)
    : 'OTHER';
}

function parseDisputeStatusValue(value: unknown): DisputeStatus {
  const status = String(value ?? 'OPEN');
  return DISPUTE_STATUSES.includes(status as DisputeStatus)
    ? (status as DisputeStatus)
    : 'OPEN';
}

function parseDisputeSummary(value: unknown): BookingDisputeStatus['dispute'] {
  const dispute = asRecord(value);
  if (!dispute) {
    return null;
  }

  return {
    id: String(dispute.id ?? ''),
    category: parseDisputeCategory(dispute.category),
    status: parseDisputeStatusValue(dispute.status),
    description: String(dispute.description ?? ''),
    resolutionNotes:
      dispute.resolutionNotes == null ? null : String(dispute.resolutionNotes),
    createdAt: String(dispute.createdAt ?? ''),
    resolvedAt: dispute.resolvedAt == null ? null : String(dispute.resolvedAt),
  };
}

function parseDisputeStatus(record: Record<string, unknown>): BookingDisputeStatus | undefined {
  const disputeStatus = asRecord(record.disputeStatus);
  if (!disputeStatus) {
    return undefined;
  }

  return {
    canRaiseDispute: disputeStatus.canRaiseDispute === true,
    hasActiveDispute: disputeStatus.hasActiveDispute === true,
    dispute: parseDisputeSummary(disputeStatus.dispute),
  };
}

function getHasReview(record: Record<string, unknown>): boolean {
  const reviewStatus = asRecord(record.reviewStatus);
  if (reviewStatus && typeof reviewStatus.hasReview === 'boolean') {
    return reviewStatus.hasReview;
  }

  return parseLegacyHasReview(record);
}

function parseLegacyHasReview(record: Record<string, unknown>): boolean {
  if (record.hasReview === true || record.reviewSubmitted === true) {
    return true;
  }

  const review = record.review ?? record.consumerReview;
  return review != null && typeof review === 'object';
}

function parseTaxRate(value?: number | string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

function parseBreakdown(value: unknown): Record<string, number> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const breakdown = Object.entries(record).reduce<Record<string, number>>((acc, [key, amount]) => {
    acc[key] = parseAmount(amount as number | string | undefined);
    return acc;
  }, {});

  return Object.keys(breakdown).length > 0 ? breakdown : undefined;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  subtotal: 'Subtotal',
  platformFee: 'Platform fee',
  addonsTotal: 'Add-ons',
  surgeAmount: 'Surge fee',
  discountAmount: 'Discount',
  taxAmount: 'Tax',
  gstAmount: 'GST',
  basePrice: 'Base price',
  servicePrice: 'Service price',
  variantPrice: 'Variant price',
  discount: 'Discount',
  couponDiscount: 'Coupon discount',
  gst: 'GST',
  serviceFee: 'Service fee',
};

type PaymentFieldKey =
  | 'basePrice'
  | 'subtotal'
  | 'addonsTotal'
  | 'platformFee'
  | 'surgeAmount'
  | 'taxAmount'
  | 'discountAmount';

const PAYMENT_FIELDS: Array<{
  key: PaymentFieldKey;
  label: string | ((booking: PopulatedBooking) => string);
  isDiscount?: boolean;
}> = [
  { key: 'basePrice', label: 'Base price' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'addonsTotal', label: 'Add-ons' },
  { key: 'platformFee', label: 'Platform fee' },
  { key: 'surgeAmount', label: 'Surge fee' },
  { key: 'taxAmount', label: getTaxLabel },
  {
    key: 'discountAmount',
    label: (booking) => (booking.couponCode ? `Discount (${booking.couponCode})` : 'Discount'),
    isDiscount: true,
  },
];

const BREAKDOWN_FIELD_ALIASES: Record<string, PaymentFieldKey> = {
  baseprice: 'basePrice',
  subtotal: 'subtotal',
  addonstotal: 'addonsTotal',
  addons: 'addonsTotal',
  platformfee: 'platformFee',
  surgeamount: 'surgeAmount',
  surge: 'surgeAmount',
  taxamount: 'taxAmount',
  tax: 'taxAmount',
  gstamount: 'taxAmount',
  gst: 'taxAmount',
  discountamount: 'discountAmount',
  discount: 'discountAmount',
};

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/\.?0+$/, '');
}

function getTaxableAmount(booking: PopulatedBooking): number {
  if (booking.taxableAmount != null && booking.taxableAmount > 0) {
    return booking.taxableAmount;
  }

  const discount = booking.discountAmount ?? 0;
  const addons = booking.addonsTotal ?? 0;
  const surge = booking.surgeAmount ?? 0;

  if (booking.subtotal != null && booking.subtotal > 0) {
    return Math.max(0, booking.subtotal + addons + surge - discount);
  }

  if (booking.basePrice != null && booking.basePrice > 0) {
    return Math.max(0, booking.basePrice + addons + surge - discount);
  }

  return Math.max(0, addons + surge - discount);
}

function getEffectiveTaxRate(booking: PopulatedBooking): number | undefined {
  if (booking.taxRate != null && booking.taxRate > 0) {
    return booking.taxRate <= 1 ? booking.taxRate * 100 : booking.taxRate;
  }

  const taxable = getTaxableAmount(booking);
  if (booking.taxAmount != null && booking.taxAmount > 0 && taxable > 0) {
    const computed = (booking.taxAmount / taxable) * 100;
    if (Number.isFinite(computed) && computed > 0) {
      return Math.round(computed * 100) / 100;
    }
  }

  return undefined;
}

function getTaxLabel(booking: PopulatedBooking): string {
  const rate = getEffectiveTaxRate(booking);
  if (rate != null) {
    return `Tax (${formatRate(rate)}%)`;
  }
  return 'Tax';
}

function getTaxCalculationInfo(booking: PopulatedBooking): string | null {
  if (booking.taxAmount == null || booking.taxAmount <= 0) {
    return null;
  }

  const taxable = getTaxableAmount(booking);
  const rate = getEffectiveTaxRate(booking);
  const taxFormatted = formatCurrency(booking.taxAmount);

  if (rate != null && taxable > 0) {
    return `${formatRate(rate)}% GST on ${formatCurrency(taxable)} taxable amount = ${taxFormatted}`;
  }

  if (taxable > 0) {
    return `Tax on ${formatCurrency(taxable)} taxable amount = ${taxFormatted}`;
  }

  return `Tax amount: ${taxFormatted}`;
}

function formatBreakdownLabel(key: string): string {
  if (BREAKDOWN_LABELS[key]) {
    return BREAKDOWN_LABELS[key];
  }

  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export interface PaymentSummaryItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

export function getPaymentSummaryItems(booking: PopulatedBooking): PaymentSummaryItem[] {
  const items: PaymentSummaryItem[] = [];
  const coveredFields = new Set<PaymentFieldKey>();

  for (const { key, label, isDiscount } of PAYMENT_FIELDS) {
    const amount = booking[key];
    if (amount == null || amount <= 0) {
      continue;
    }

    if (key === 'basePrice' && (booking.subtotal ?? 0) > 0) {
      continue;
    }

    const resolvedLabel = typeof label === 'function' ? label(booking) : label;
    items.push({
      label: resolvedLabel,
      amount: isDiscount ? -amount : amount,
      isDiscount,
    });
    coveredFields.add(key);
  }

  if (booking.breakdown) {
    for (const [key, amount] of Object.entries(booking.breakdown)) {
      const alias = BREAKDOWN_FIELD_ALIASES[key.toLowerCase()];
      if (alias && coveredFields.has(alias)) {
        continue;
      }

      const isDiscount = key.toLowerCase().includes('discount') || amount < 0;
      if (isDiscount) {
        if (Math.abs(amount) > 0) {
          items.push({
            label: formatBreakdownLabel(key),
            amount: -Math.abs(amount),
            isDiscount: true,
          });
        }
        continue;
      }

      if (amount > 0) {
        items.push({ label: formatBreakdownLabel(key), amount });
      }
    }
  }

  return items;
}

export function getPaymentSummaryTotal(booking: PopulatedBooking): number {
  if (booking.totalAmount > 0) {
    return booking.totalAmount;
  }

  const items = getPaymentSummaryItems(booking);
  if (items.length > 0) {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }

  return 0;
}

export function getTaxCalculationInfoText(booking: PopulatedBooking): string | null {
  return getTaxCalculationInfo(booking);
}

export function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function getBookingReference(booking: {
  id?: string;
  bookingNumber?: string;
}): string {
  if (booking.bookingNumber) {
    return booking.bookingNumber;
  }
  if (booking.id) {
    return `#${booking.id.slice(-6).toUpperCase()}`;
  }
  return 'Booking';
}

export function getServiceName(booking: PopulatedBooking): string {
  return booking.serviceName || booking.service?.name || booking.bookingName || 'Service';
}

export function getAddressText(booking: PopulatedBooking): string | null {
  if (booking.addressSnapshot?.trim()) {
    return booking.addressSnapshot.trim();
  }
  if (!booking.address) return null;

  const cityLine = [booking.address.city, booking.address.state, booking.address.pincode]
    .filter(Boolean)
    .join(', ');
  const parts = [booking.address.label, booking.address.line1, booking.address.line2, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join('\n') : null;
}

export function normalizeBookingsListResponse(
  response: unknown,
): { bookings: PopulatedBooking[]; total: number } {
  const payload =
    response && typeof response === 'object' && 'data' in response
      ? (response as { data?: { bookings?: unknown[]; total?: number } }).data
      : response;

  if (!payload || typeof payload !== 'object') {
    return { bookings: [], total: 0 };
  }

  const rawBookings = (payload as { bookings?: unknown[] }).bookings ?? [];

  const bookings = rawBookings
    .map((booking) => {
      try {
        return normalizePopulatedBooking(booking);
      } catch {
        return null;
      }
    })
    .filter((booking): booking is PopulatedBooking => booking != null);

  return {
    bookings,
    total: (payload as { total?: number }).total ?? bookings.length,
  };
}

export interface NormalizedPaymentOrder {
  razorpayOrderId: string;
  amount: number;
}

/**
 * Normalizes payment order API responses.
 * Supports `{ order, payment }` and flat `PaymentOrder` shapes.
 */
export function normalizePaymentOrder(value: unknown): NormalizedPaymentOrder {
  const record = asRecord(value);
  if (!record) {
    throw new Error('Invalid payment order response');
  }

  if (asRecord(record.payment)) {
    const payment = asRecord(record.payment)!;
    const razorpayOrderId = String(payment.razorpayOrderId ?? '');
    const amount = Number(payment.amount ?? 0);

    if (!razorpayOrderId) {
      throw new Error('Payment order response missing razorpayOrderId');
    }

    return { razorpayOrderId, amount };
  }

  const razorpayOrderId = String(record.razorpayOrderId ?? '');
  const amount = Number(record.amount ?? 0);

  if (!razorpayOrderId) {
    throw new Error('Payment order response missing razorpayOrderId');
  }

  return { razorpayOrderId, amount };
}
