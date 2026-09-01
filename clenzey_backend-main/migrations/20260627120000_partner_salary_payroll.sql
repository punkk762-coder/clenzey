CREATE TYPE "public"."ledger_entry_type" AS ENUM('SALARY', 'SALARY_DEDUCTION', 'INCENTIVE');--> statement-breakpoint
CREATE TYPE "public"."attendance_source" AS ENUM('ADMIN', 'ATTENDANCE_SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('PENDING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "partner_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"booking_id" uuid,
	"review_id" uuid,
	"payroll_period" text,
	"earning_date" timestamp with time zone NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "incentive_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"percentage" numeric(5, 2) NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "partner_monthly_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"absent_days" integer DEFAULT 0 NOT NULL,
	"source" "attendance_source" DEFAULT 'ADMIN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "partner_payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"payroll_period" text NOT NULL,
	"base_salary" numeric(10, 2) NOT NULL,
	"absent_days" integer DEFAULT 0 NOT NULL,
	"deduction_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_salary" numeric(10, 2) NOT NULL,
	"status" "payroll_run_status" DEFAULT 'PENDING' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "monthly_salary" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "salary_effective_from" date;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "is_payroll_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "breakdown" jsonb;--> statement-breakpoint
DROP TABLE IF EXISTS "earnings" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "commission_configs" CASCADE;--> statement-breakpoint
ALTER TABLE "partner_ledger_entries" ADD CONSTRAINT "partner_ledger_entries_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_ledger_entries" ADD CONSTRAINT "partner_ledger_entries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_ledger_entries" ADD CONSTRAINT "partner_ledger_entries_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incentive_configs" ADD CONSTRAINT "incentive_configs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_monthly_attendance" ADD CONSTRAINT "partner_monthly_attendance_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payroll_runs" ADD CONSTRAINT "partner_payroll_runs_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_ledger_entries_review_id_unique" ON "partner_ledger_entries" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "partner_ledger_entries_partner_id_idx" ON "partner_ledger_entries" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_ledger_entries_earning_date_idx" ON "partner_ledger_entries" USING btree ("earning_date");--> statement-breakpoint
CREATE INDEX "partner_ledger_entries_type_idx" ON "partner_ledger_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "partner_ledger_entries_payroll_period_idx" ON "partner_ledger_entries" USING btree ("payroll_period");--> statement-breakpoint
CREATE INDEX "incentive_configs_service_idx" ON "incentive_configs" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "incentive_configs_active_idx" ON "incentive_configs" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_monthly_attendance_partner_period_unique" ON "partner_monthly_attendance" USING btree ("partner_id","year","month");--> statement-breakpoint
CREATE INDEX "partner_monthly_attendance_period_idx" ON "partner_monthly_attendance" USING btree ("year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_payroll_runs_partner_period_unique" ON "partner_payroll_runs" USING btree ("partner_id","payroll_period");--> statement-breakpoint
CREATE INDEX "partner_payroll_runs_status_idx" ON "partner_payroll_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partner_payroll_runs_payroll_period_idx" ON "partner_payroll_runs" USING btree ("payroll_period");
