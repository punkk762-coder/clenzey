import { pgEnum } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export const adminRoleEnum = pgEnum("admin_role", [
  "OPERATIONS",
  "SUPPORT",
  "FINANCE",
  "SUPER_ADMIN",
]);

export const pricingModelEnum = pgEnum("pricing_model", [
  "FIXED",
  "STARTING_AT",
  "INSPECTION",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PROFESSIONAL_ASSIGNED",
  "PROFESSIONAL_EN_ROUTE",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "NO_SHOW",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "PROPOSED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "REASSIGNED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "PENDING",
  "ON_HOLD",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REVERSED",
]);

export const trackingEventTypeEnum = pgEnum("tracking_event_type", [
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "CHECKED_IN",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "LOCATION_PING",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "PUSH",
  "SMS",
  "EMAIL",
  "IN_APP",
]);

export const kycDocumentTypeEnum = pgEnum("kyc_document_type", [
  "AADHAAR",
  "PAN",
  "DRIVING_LICENSE",
  "BUSINESS_PROOF",
  "SELFIE",
]);

export const userTypeEnum = pgEnum("user_type", [
  "CONSUMER",
  "PARTNER",
  "ADMIN",
]);

export const otpChannelEnum = pgEnum("otp_channel", [
  "sms",
  "whatsapp",
  "call",
]);

export const serviceCategoryEnum = pgEnum("service_category", [
  "QUICK_SHINE",
  "DEEP_CLEANING",
  "DEEP_LUXE",
  "CORPORATE",
]);

export const variantTypeEnum = pgEnum("variant_type", [
  "DURATION",
  "BHK",
  "BUSINESS_TYPE",
  "EMPLOYEE_SIZE",
  "CARPET_AREA",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "ONE_TIME",
  "DAILY",
  "WEEKLY",
  "FORTNIGHTLY",
  "MONTHLY",
  "CUSTOM",
]);

export const bookingTypeEnum = pgEnum("booking_type", [
  "INSTANT",
  "SCHEDULED",
]);

export const quotationStatusEnum = pgEnum("quotation_status", [
  "PENDING",
  "SCHEDULED",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
]);

export const couponTypeEnum = pgEnum("coupon_type", ["PERCENTAGE", "FLAT"]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
]);

export const addressTypeEnum = pgEnum("address_type", [
  "HOME",
  "WORK",
  "OTHER",
]);

export const zoneStatusEnum = pgEnum("zone_status", [
  "ACTIVE",
  "INACTIVE",
  "DRAFT",
]);

export const zoneTierEnum = pgEnum("zone_tier", [
  "STANDARD",
  "PREMIUM",
  "CORPORATE_ONLY",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
]);

export const disputeCategoryEnum = pgEnum("dispute_category", [
  "SERVICE_QUALITY",
  "PRICING",
  "DAMAGE",
  "NO_SHOW",
  "OTHER",
]);

export const photoTypeEnum = pgEnum("photo_type", ["BEFORE", "AFTER"]);

export const devicePlatformEnum = pgEnum("device_platform", [
  "ANDROID",
  "IOS",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "PENDING",
  "IN_PROGRESS",
  "VERIFIED",
  "REJECTED",
]);

export const kycDocStatusEnum = pgEnum("kyc_doc_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "SALARY",
  "SALARY_DEDUCTION",
  "INCENTIVE",
]);

export const attendanceSourceEnum = pgEnum("attendance_source", [
  "ADMIN",
  "ATTENDANCE_SYSTEM",
]);

export const payrollRunStatusEnum = pgEnum("payroll_run_status", [
  "PENDING",
  "PROCESSED",
  "FAILED",
]);

export type OtpChannel = (typeof otpChannelEnum.enumValues)[number];
export type UserType = (typeof userTypeEnum.enumValues)[number];
export type LedgerEntryType = (typeof ledgerEntryTypeEnum.enumValues)[number];
