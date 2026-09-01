export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: { code: string; details?: unknown };
};

export type AdminRole = "OPERATIONS" | "SUPPORT" | "FINANCE" | "SUPER_ADMIN";
export type UserType = "CONSUMER" | "PARTNER" | "ADMIN";

export type BookingStatus =
  | "PENDING"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "PROFESSIONAL_ASSIGNED"
  | "PROFESSIONAL_EN_ROUTE"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "NO_SHOW";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type ApprovalStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";


export type ZoneStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export type ZoneTier = "STANDARD" | "PREMIUM" | "CORPORATE_ONLY";

export type Booking = {
  id: string;
  bookingNumber: string;
  bookingType: "INSTANT" | "SCHEDULED";
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  partnerId: string | null;
  serviceId: string;
  serviceName: string;
  variantLabel: string;
  addressId: string;
  addressSnapshot: string;
  basePrice: string;
  totalAmount: string;
  subtotal: string;
  surgeAmount: string;
  surgeMultiplier: string;
  discountAmount: string;
  taxAmount: string;
  platformFee: string;
  estimatedDurationMin?: number;
  addonsTotal?: string;
  paymentMode?: string | null;
  scheduledEndAt?: string | null;
  subscriptionPlan?: "ONE_TIME" | "WEEKLY" | "MONTHLY";
  variantId?: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Legacy list fields — prefer `history` on booking detail. */
  confirmedAt?: string | null;
  partnerAssignedAt?: string | null;
  enRouteAt?: string | null;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  /** Consumer verification code — admin support visibility. */
  checkInCode?: string | null;
};

export type BookingAddon = {
  id: string;
  addonId: string | null;
  name: string;
  price: string;
  quantity: number;
};

export type BookingStatusHistoryItem = {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  createdAt: string;
  actorId?: string | null;
  actorType?: "CONSUMER" | "PARTNER" | "ADMIN" | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type BookingDetail = Booking & {
  addons: BookingAddon[];
  history: BookingStatusHistoryItem[];
};

export type ConsumerAddress = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  isServiceable: boolean;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
};

export type ServiceInclusion = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
};

export type ServiceSubVariant = {
  id: string;
  label: string;
  description?: string | null;
  basePrice: string;
  discountedPrice: string;
  discountPercentage: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder: number;
};

export type ServiceVariant = {
  id: string;
  label: string;
  value: string;
  basePrice: string;
  discountedPrice: string;
  discountPercentage: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder: number;
  inclusions: ServiceInclusion[];
  subVariants: ServiceSubVariant[];
};

export type ServiceAddon = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  discountedPrice: string;
  discountPercentage: number;
  sortOrder: number;
};

export type Service = {
  id: string;
  serviceType: "B2C" | "B2B";
  name: string;
  tagline: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
  inclusions: ServiceInclusion[];
  createdAt: string;
  updatedAt: string;
};

export type ServiceDetail = Service;

export type Partner = {
  id: string;
  fullName: string | null;
  phone?: string;
  approvalStatus: ApprovalStatus;
  approvalDate: string | null;
  isAvailable: boolean;
  experienceYears: number | null;
  bio: string | null;
  languages: string[];
  profileImage: string | null;
  rating?: number;
  totalBookings?: number;
  monthlySalary?: number | null;
  isPayrollActive?: boolean;
  salaryEffectiveFrom?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Consumer = {
  id: string;
  fullName: string | null;
  phone?: string;
  isActive: boolean;
  referralCode: string;
  totalBookings?: number;
  totalSpend?: string;
  createdAt: string;
};

export type Zone = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  country: string;
  status: ZoneStatus;
  tier: ZoneTier;
  priority: number;
  surgeMultiplier: string;
  centerLat: string | null;
  centerLng: string | null;
  createdAt: string;
  updatedAt: string;
  boundaryGeoJSON?: {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
  services?: { id: string; zoneId: string; serviceId: string; isAvailable: boolean }[];
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string | null;
  firstBookingOnly: boolean;
  applicableCategories: string[];
  applicableServiceIds: string[];
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Quotation = {
  id: string;
  name: string;
  phone: string;
  address: string;
  preferredTime: string | null;
  notes: string | null;
  serviceId: string | null;
  variantId: string | null;
  quotedAmount: number | null;
  serviceName: string | null;
  status: "PENDING" | "SCHEDULED" | "QUOTED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
};

// ─── KPI Types ───────────────────────────────────────────────────────────────

export type KpiData = {
  totalBookings: number;
  totalBookingsChange?: number;
  revenue: number;
  revenueChange?: number;
  activePartners: number;
  activePartnersChange?: number;
  pendingApprovals?: number;
  averageRating?: number | null;
  fulfillmentRate: number;
  unassignedTasks: number;
  activeDisputes: number;
};

export type PartnerPerformance = {
  partnerId: string;
  partnerName: string | null;
  bookingsCompleted: number;
  averageRating: number | null;
  totalEarnings: number;
  acceptanceRate: number | null;
};

// ─── Revenue Analytics ───────────────────────────────────────────────────────

export type DailyRevenue = {
  date: string;
  revenue: number;
  bookingCount: number;
};

export type RevenueAnalyticsData = {
  dailyBreakdown: DailyRevenue[];
  totalRevenue: number;
  previousPeriodChange: number;
};

// ─── Partner Analytics ───────────────────────────────────────────────────────

export type PartnerGrowthPoint = {
  date: string;
  bookings: number;
  revenue: number;
};

export type PartnerAnalyticsData = {
  series: PartnerGrowthPoint[];
};

// ─── Customer Analytics ──────────────────────────────────────────────────────

export type CustomerAnalyticsData = {
  signupTrend: { date: string; count: number }[];
  activeUsers: number;
  repeatRate: number;
  lifetimeValue: number;
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  bookingId: string;
  consumerId: string;
  consumerName: string;
  partnerId: string;
  partnerName: string;
  rating: number;
  text: string;
  createdAt: string;
};

export type RatingDistribution = {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
  total: number;
  averageRating: number;
  previousMonthAverage: number;
};

// ─── Disputes ────────────────────────────────────────────────────────────────

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
export type DisputeCategory =
  | "SERVICE_QUALITY"
  | "PRICING"
  | "NO_SHOW"
  | "DAMAGE"
  | "OTHER";

export type Dispute = {
  id: string;
  bookingId: string;
  bookingReference: string;
  category: DisputeCategory;
  status: DisputeStatus;
  consumerName: string;
  partnerName: string;
  description: string;
  resolutionNotes: string | null;
  /** @deprecated Use resolutionNotes — kept for backward compat during mapping */
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Payments ────────────────────────────────────────────────────────────────

export type BackendPayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";
export type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ON_HOLD";

export type PartnerPayout = {
  id: string;
  partnerId: string;
  partnerName: string;
  amount?: number;
  volume?: number;
  commissionAmount?: number;
  commissionPercentage?: number;
  status: BackendPayoutStatus | PayoutStatus;
  periodStart?: string;
  periodEnd?: string;
  createdAt?: string;
  notes?: string | null;
};

export type RefundStatus = "INITIATED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type Refund = {
  id: string;
  transactionId?: string;
  bookingId: string;
  bookingReference?: string;
  customerId?: string;
  customerName?: string;
  originalAmount?: number;
  refundAmount: number;
  amount?: number;
  reason: string | null;
  status: RefundStatus;
  createdAt: string;
};

// ─── Activity Feed ───────────────────────────────────────────────────────────

export type ActivityEvent = {
  id: string;
  category: "partner_onboarded" | "large_transaction" | "service_alert" | "partner_updated";
  title: string;
  description: string;
  timestamp: string;
};

// ─── Area Pricing ────────────────────────────────────────────────────────────

export type AreaPricingTier = {
  id?: string;
  label: string;
  minSqFt: number;
  maxSqFt: number | null;
  rateType: "FLAT" | "PER_SQFT";
  rate: number;
};

// ─── Partner Extended ────────────────────────────────────────────────────────

export type PartnerExtended = Partner & {
  /** Service IDs assigned as partner skills */
  skills: string[];
};

export type CommissionConfig = {
  id: string;
  percentage: number;
  minimumAmount: number;
  serviceId: string | null;
  effectiveFrom: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Response Wrapper Types ──────────────────────────────────────────────────

export type KpiResponse = { data: KpiData };
export type RevenueAnalyticsResponse = { data: RevenueAnalyticsData };
export type PartnerAnalyticsResponse = { data: PartnerAnalyticsData };
export type CustomerAnalyticsResponse = { data: CustomerAnalyticsData };
export type ReviewListResponse = { data: Review[]; total: number };
export type RatingDistributionResponse = { data: RatingDistribution };
export type DisputeListResponse = { data: Dispute[]; total: number };
export type DisputeResponse = { data: Dispute };
export type PaymentsSummaryResponse = {
  data: {
    totalRevenue: number;
    revenueChange: number;
    dailyRevenue: number[];
    totalPayouts: number;
    pendingPayouts: number;
    refundRate: number;
    openRefunds: number;
  };
};
export type PayoutListResponse = { data: PartnerPayout[]; total: number };
export type RefundListResponse = { data: Refund[]; total: number };
export type AvailablePartnersResponse = { data: Partner[] };

// ─── Filter Types ────────────────────────────────────────────────────────────

export type BookingListFilter = {
  status?: BookingStatus;
  serviceId?: string;
  partnerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type ReviewFilter = {
  partnerId?: string;
  partnerName?: string;
  consumerId?: string;
  consumerName?: string;
  minRating?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type DisputeFilter = {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type PayoutFilter = {
  status?: PayoutStatus | BackendPayoutStatus;
  partnerId?: string;
  limit?: number;
  offset?: number;
};
