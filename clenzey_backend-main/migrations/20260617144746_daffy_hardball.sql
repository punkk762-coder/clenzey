CREATE TABLE "referrals" (
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referee_coupon_id" uuid,
	"referee_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"referrer_coupon_id" uuid,
	"referrer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumers" DROP COLUMN IF EXISTS "referrer_id";--> statement-breakpoint
ALTER TABLE "consumers" ADD COLUMN "referrer_id" uuid;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "issued_to_consumer_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_coupon_id_coupons_id_fk" FOREIGN KEY ("referee_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_consumers_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_coupon_id_coupons_id_fk" FOREIGN KEY ("referrer_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_consumers_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referee_id_idx" ON "referrals" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_id_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_referrer_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."consumers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_issued_to_consumer_id_consumers_id_fk" FOREIGN KEY ("issued_to_consumer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;