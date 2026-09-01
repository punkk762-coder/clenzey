CREATE TABLE "masked_call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"twilio_proxy_session_sid" text NOT NULL,
	"virtual_number" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zone_price_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"override_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "masked_call_sessions" ADD CONSTRAINT "masked_call_sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_price_overrides" ADD CONSTRAINT "zone_price_overrides_zone_id_service_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."service_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_price_overrides" ADD CONSTRAINT "zone_price_overrides_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "masked_call_sessions_booking_idx" ON "masked_call_sessions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "masked_call_sessions_status_idx" ON "masked_call_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "zone_price_overrides_unique_idx" ON "zone_price_overrides" USING btree ("zone_id","service_id","variant_id");--> statement-breakpoint
CREATE INDEX "zone_price_overrides_zone_idx" ON "zone_price_overrides" USING btree ("zone_id");