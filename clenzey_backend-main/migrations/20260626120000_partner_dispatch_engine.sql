CREATE TABLE "partner_zones" (
	"partner_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_zones_partner_id_zone_id_pk" PRIMARY KEY("partner_id","zone_id")
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "base_location" geography;--> statement-breakpoint
ALTER TABLE "partner_zones" ADD CONSTRAINT "partner_zones_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_zones" ADD CONSTRAINT "partner_zones_zone_id_service_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."service_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_zones_zone_id_idx" ON "partner_zones" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_locations_location_idx" ON "partner_locations" USING btree ("location");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_zones_boundary_idx" ON "service_zones" USING btree ("boundary");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumer_addresses_location_idx" ON "consumer_addresses" USING btree ("location");
