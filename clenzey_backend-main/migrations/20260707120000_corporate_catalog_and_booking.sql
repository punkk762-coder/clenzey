ALTER TYPE "public"."subscription_plan" ADD VALUE IF NOT EXISTS 'DAILY';--> statement-breakpoint
ALTER TYPE "public"."subscription_plan" ADD VALUE IF NOT EXISTS 'FORTNIGHTLY';--> statement-breakpoint
ALTER TYPE "public"."subscription_plan" ADD VALUE IF NOT EXISTS 'CUSTOM';--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "corporate_details" jsonb;
