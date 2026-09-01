ALTER TABLE "admins" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "username" text;--> statement-breakpoint
UPDATE "admins" SET "username" = 'admin_' || LEFT(id::text, 8), "password_hash" = 'CHANGE_ME' WHERE "username" IS NULL;--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "password_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_username_unique" UNIQUE("username");
