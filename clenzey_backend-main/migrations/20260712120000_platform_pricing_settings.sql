CREATE TABLE IF NOT EXISTS "platform_pricing_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"platform_fee_flat" numeric(10, 2) NOT NULL,
	"platform_fee_percent" numeric(5, 2) NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_pricing_settings_active_idx" ON "platform_pricing_settings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_pricing_settings_effective_idx" ON "platform_pricing_settings" USING btree ("effective_from");--> statement-breakpoint
INSERT INTO "platform_pricing_settings" ("gst_rate", "platform_fee_flat", "platform_fee_percent")
SELECT 18.00, 19.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM "platform_pricing_settings");
