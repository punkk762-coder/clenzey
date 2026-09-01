CREATE TYPE "public"."address_type" AS ENUM('HOME', 'WORK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('OPERATIONS', 'SUPPORT', 'FINANCE', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('PROPOSED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REASSIGNED');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'PROFESSIONAL_ASSIGNED', 'PROFESSIONAL_EN_ROUTE', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."booking_type" AS ENUM('INSTANT', 'SCHEDULED');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('PERCENTAGE', 'FLAT');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('ANDROID', 'IOS');--> statement-breakpoint
CREATE TYPE "public"."dispute_category" AS ENUM('SERVICE_QUALITY', 'PRICING', 'DAMAGE', 'NO_SHOW', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."kyc_doc_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."kyc_document_type" AS ENUM('AADHAAR', 'PAN', 'DRIVING_LICENSE', 'BUSINESS_PROOF', 'SELFIE');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('PUSH', 'SMS', 'EMAIL', 'IN_APP');--> statement-breakpoint
CREATE TYPE "public"."otp_channel" AS ENUM('sms', 'whatsapp', 'call');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'ON_HOLD', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."photo_type" AS ENUM('BEFORE', 'AFTER');--> statement-breakpoint
CREATE TYPE "public"."pricing_model" AS ENUM('FIXED', 'STARTING_AT', 'INSPECTION');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('PENDING', 'SCHEDULED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('QUICK_SHINE', 'DEEP_CLEANING', 'DEEP_LUXE', 'CORPORATE');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('ONE_TIME', 'WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."tracking_event_type" AS ENUM('ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CHECKED_IN', 'STARTED', 'COMPLETED', 'CANCELLED', 'LOCATION_PING');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('CONSUMER', 'PARTNER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."variant_type" AS ENUM('DURATION', 'BHK', 'BUSINESS_TYPE', 'EMPLOYEE_SIZE', 'CARPET_AREA');--> statement-breakpoint
CREATE TYPE "public"."zone_status" AS ENUM('ACTIVE', 'INACTIVE', 'DRAFT');--> statement-breakpoint
CREATE TYPE "public"."zone_tier" AS ENUM('STANDARD', 'PREMIUM', 'CORPORATE_ONLY');--> statement-breakpoint
CREATE TABLE "admins" (
	"email" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"phone" text NOT NULL,
	"role" "admin_role" DEFAULT 'SUPPORT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email"),
	CONSTRAINT "admins_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "bank_details" (
	"account_holder_name" text NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ifsc_code" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_eta" (
	"booking_id" uuid PRIMARY KEY NOT NULL,
	"distance_km" numeric(8, 2),
	"eta_minutes" integer NOT NULL,
	"last_partner_lat" numeric(10, 7),
	"last_partner_lng" numeric(10, 7),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_photos" (
	"booking_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "photo_type" NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_addons" (
	"addon_id" uuid,
	"booking_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"actor_id" uuid,
	"actor_type" "user_type",
	"booking_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_status" "booking_status",
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"reason" text,
	"to_status" "booking_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"address_id" uuid NOT NULL,
	"addons_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"address_snapshot" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"booking_number" text NOT NULL,
	"booking_type" "booking_type" NOT NULL,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_id" uuid,
	"cancelled_by_type" "user_type",
	"checked_in_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"consumer_id" uuid NOT NULL,
	"consumer_name" text NOT NULL,
	"consumer_notes" text,
	"consumer_phone" text NOT NULL,
	"coupon_code" text,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"en_route_at" timestamp with time zone,
	"estimated_duration_min" integer DEFAULT 60 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_notes" text,
	"partner_assigned_at" timestamp with time zone,
	"partner_id" uuid,
	"payment_mode" text,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"scheduled_end_at" timestamp with time zone,
	"service_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"started_at" timestamp with time zone,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"subscription_plan" "subscription_plan" DEFAULT 'ONE_TIME' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"surge_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"surge_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"time_slot_id" uuid,
	"total_amount" numeric(10, 2) NOT NULL,
	"variant_id" uuid NOT NULL,
	"variant_label" text NOT NULL,
	"sub_variant_id" text,
	"sub_variant_label" text,
	"booking_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "commission_configs" (
	"effective_from" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"minimum_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"service_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumer_addresses" (
	"access_notes" text,
	"address_type" "address_type" DEFAULT 'HOME' NOT NULL,
	"city" text NOT NULL,
	"consumer_id" uuid NOT NULL,
	"country" text DEFAULT 'India' NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_serviceable" boolean DEFAULT false NOT NULL,
	"label" text NOT NULL,
	"landmark" text,
	"latitude" numeric(10, 7),
	"line1" text NOT NULL,
	"line2" text,
	"location" geography,
	"longitude" numeric(10, 7),
	"pincode" text NOT NULL,
	"place_id" text,
	"recipient_name" text,
	"recipient_phone" text,
	"state" text NOT NULL,
	"zone_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumers" (
	"full_name" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"referral_code" text NOT NULL,
	"referrer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consumers_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "contact_logs" (
	"booking_id" uuid NOT NULL,
	"consumer_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"requested_by_type" "user_type" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"device_token" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "device_platform" NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" "user_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"booking_id" uuid NOT NULL,
	"category" "dispute_category" NOT NULL,
	"description" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raised_by_id" uuid NOT NULL,
	"raised_by_type" "user_type" NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings" (
	"booking_id" uuid NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"earning_date" timestamp with time zone NOT NULL,
	"gross_amount" numeric(10, 2) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"net_amount" numeric(10, 2) NOT NULL,
	"partner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"document_type" "kyc_document_type" NOT NULL,
	"file_url" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"status" "kyc_doc_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"body" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"recipient_id" uuid NOT NULL,
	"recipient_type" "user_type" NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"approval_date" timestamp with time zone,
	"approval_rejection_reason" text,
	"approval_status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" uuid,
	"avg_rating" numeric(3, 2),
	"bio" text,
	"dob" date,
	"experience_years" integer,
	"full_name" text,
	"gender" "gender",
	"id" uuid PRIMARY KEY NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'PENDING' NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"profile_image" text,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid,
	"payload" jsonb NOT NULL,
	"provider" text DEFAULT 'RAZORPAY' NOT NULL,
	"provider_event_id" text,
	CONSTRAINT "payment_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"amount" numeric(10, 2) NOT NULL,
	"booking_id" uuid NOT NULL,
	"captured_at" timestamp with time zone,
	"currency" text DEFAULT 'INR' NOT NULL,
	"failure_reason" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'RAZORPAY' NOT NULL,
	"raw_payload" jsonb,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payments_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"amount" numeric(10, 2) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiated_by" uuid NOT NULL,
	"notes" text,
	"paid_at" timestamp with time zone,
	"partner_id" uuid NOT NULL,
	"period_end" timestamp with time zone,
	"period_start" timestamp with time zone,
	"status" "payout_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"booking_id" uuid,
	"consumer_id" uuid NOT NULL,
	"coupon_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"applicable_categories" "service_category"[] DEFAULT '{}' NOT NULL,
	"applicable_service_ids" uuid[] DEFAULT '{}' NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discount_type" "coupon_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"first_booking_only" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_discount_amount" numeric(10, 2),
	"min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"per_user_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"usage_limit" integer,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"amount" numeric(10, 2) NOT NULL,
	"booking_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiated_by" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"razorpay_refund_id" text,
	"reason" text,
	"status" text DEFAULT 'INITIATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"booking_id" uuid NOT NULL,
	"consumer_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_assignments" (
	"booking_id" uuid NOT NULL,
	"decline_reason" text,
	"distance_meters" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"status" "assignment_status" DEFAULT 'PROPOSED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_availability" (
	"day_of_week" "day_of_week" NOT NULL,
	"end_hour" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"partner_id" uuid NOT NULL,
	"start_hour" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_locations" (
	"heading" numeric(5, 2),
	"is_online" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" geography,
	"partner_id" uuid PRIMARY KEY NOT NULL,
	"speed" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"capacity" integer DEFAULT 5 NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"reserved_count" integer DEFAULT 0 NOT NULL,
	"service_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"phone" text NOT NULL,
	"token" text NOT NULL,
	"user_type" "user_type" NOT NULL,
	CONSTRAINT "secrets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "quotation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"variant_id" uuid,
	"consumer_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"preferred_time" timestamp with time zone,
	"notes" text,
	"quoted_amount" integer,
	"status" "quotation_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "service_category" DEFAULT 'QUICK_SHINE' NOT NULL,
	"service_type" text DEFAULT 'B2C' NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"pricing_model" "pricing_model" DEFAULT 'FIXED' NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"email" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "service_zone_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"service_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_zones" (
	"boundary" geography NOT NULL,
	"center_lat" numeric(10, 7),
	"center_lng" numeric(10, 7),
	"city" text NOT NULL,
	"country" text DEFAULT 'India' NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"slug" text NOT NULL,
	"state" text NOT NULL,
	"status" "zone_status" DEFAULT 'DRAFT' NOT NULL,
	"surge_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"tier" "zone_tier" DEFAULT 'STANDARD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_eta" ADD CONSTRAINT "booking_eta_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_photos" ADD CONSTRAINT "booking_photos_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_address_id_consumer_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."consumer_addresses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_configs" ADD CONSTRAINT "commission_configs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_addresses" ADD CONSTRAINT "consumer_addresses_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumer_addresses" ADD CONSTRAINT "consumer_addresses_zone_id_service_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."service_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_logs" ADD CONSTRAINT "contact_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_skills" ADD CONSTRAINT "partner_skills_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_skills" ADD CONSTRAINT "partner_skills_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_availability" ADD CONSTRAINT "partner_availability_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_locations" ADD CONSTRAINT "partner_locations_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD CONSTRAINT "quotation_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD CONSTRAINT "quotation_requests_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_zone_services" ADD CONSTRAINT "service_zone_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_zone_services" ADD CONSTRAINT "service_zone_services_zone_id_service_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."service_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_details_partner_unique" ON "bank_details" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "booking_photos_booking_id_idx" ON "booking_photos" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_photos_type_idx" ON "booking_photos" USING btree ("booking_id","type");--> statement-breakpoint
CREATE INDEX "booking_addons_booking_id_idx" ON "booking_addons" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_status_history_booking_id_idx" ON "booking_status_history" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_status_history_created_at_idx" ON "booking_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_consumer_id_idx" ON "bookings" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "bookings_partner_id_idx" ON "bookings" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_scheduled_at_idx" ON "bookings" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "bookings_booking_number_idx" ON "bookings" USING btree ("booking_number");--> statement-breakpoint
CREATE INDEX "commission_configs_service_idx" ON "commission_configs" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "commission_configs_active_idx" ON "commission_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "consumer_addresses_consumer_id_idx" ON "consumer_addresses" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "consumer_addresses_pincode_idx" ON "consumer_addresses" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "consumer_addresses_zone_id_idx" ON "consumer_addresses" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consumer_addresses_consumer_label_idx" ON "consumer_addresses" USING btree ("consumer_id","label") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "contact_logs_booking_id_idx" ON "contact_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_unique" ON "device_tokens" USING btree ("device_token");--> statement-breakpoint
CREATE INDEX "device_tokens_user_idx" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "disputes_booking_id_idx" ON "disputes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disputes_raised_by_idx" ON "disputes" USING btree ("raised_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "earnings_booking_id_unique" ON "earnings" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "earnings_partner_id_idx" ON "earnings" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "earnings_earning_date_idx" ON "earnings" USING btree ("earning_date");--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_documents_partner_type_unique" ON "kyc_documents" USING btree ("partner_id","document_type");--> statement-breakpoint
CREATE INDEX "kyc_documents_partner_idx" ON "kyc_documents" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","recipient_type");--> statement-breakpoint
CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "partners_approval_status_is_available_idx" ON "partners" USING btree ("approval_status","is_available");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_skills_unique" ON "partner_skills" USING btree ("partner_id","service_id");--> statement-breakpoint
CREATE INDEX "partner_skills_service_idx" ON "partner_skills" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payouts_partner_id_idx" ON "payouts" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_id_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_consumer_id_idx" ON "coupon_redemptions" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "refunds_booking_id_idx" ON "refunds" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "refunds_payment_id_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_id_unique" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_partner_id_idx" ON "reviews" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "reviews_consumer_id_idx" ON "reviews" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_assignments_booking_idx" ON "booking_assignments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_assignments_partner_idx" ON "booking_assignments" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "booking_assignments_status_idx" ON "booking_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partner_availability_partner_idx" ON "partner_availability" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_availability_partner_day_idx" ON "partner_availability" USING btree ("partner_id","day_of_week","start_hour");--> statement-breakpoint
CREATE INDEX "partner_locations_online_idx" ON "partner_locations" USING btree ("is_online");--> statement-breakpoint
CREATE INDEX "time_slots_service_start_idx" ON "time_slots" USING btree ("service_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "time_slots_unique_idx" ON "time_slots" USING btree ("service_id","start_at");--> statement-breakpoint
CREATE INDEX "quotation_requests_consumer_id_idx" ON "quotation_requests" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "quotation_requests_service_id_idx" ON "quotation_requests" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_zone_services_unique_idx" ON "service_zone_services" USING btree ("zone_id","service_id");--> statement-breakpoint
CREATE INDEX "service_zone_services_service_idx" ON "service_zone_services" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_zones_slug_idx" ON "service_zones" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "service_zones_city_status_idx" ON "service_zones" USING btree ("city","status");--> statement-breakpoint
CREATE INDEX "service_zones_status_priority_idx" ON "service_zones" USING btree ("status","priority");