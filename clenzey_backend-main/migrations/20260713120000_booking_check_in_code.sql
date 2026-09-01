ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_in_code" varchar(4);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_in_code_verified_at" timestamp with time zone;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "check_in_code_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Backfill existing rows. Prefer distinct codes among non-terminal bookings.
DO $$
DECLARE
  r RECORD;
  candidate text;
  attempts int;
BEGIN
  FOR r IN
    SELECT id, status FROM bookings WHERE check_in_code IS NULL ORDER BY created_at
  LOOP
    attempts := 0;
    LOOP
      attempts := attempts + 1;
      candidate := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');

      IF r.status NOT IN ('COMPLETED','CANCELLED','REFUNDED','NO_SHOW')
         AND EXISTS (
           SELECT 1 FROM bookings b
           WHERE b.check_in_code = candidate
             AND b.status NOT IN ('COMPLETED','CANCELLED','REFUNDED','NO_SHOW')
         )
      THEN
        IF attempts >= 100 THEN
          RAISE EXCEPTION 'Unable to backfill check_in_code for booking %', r.id;
        END IF;
        CONTINUE;
      END IF;

      UPDATE bookings SET check_in_code = candidate WHERE id = r.id;
      EXIT;
    END LOOP;
  END LOOP;
END $$;
--> statement-breakpoint

ALTER TABLE "bookings" ALTER COLUMN "check_in_code" SET NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_active_check_in_code_uidx"
  ON "bookings" ("check_in_code")
  WHERE "status" NOT IN ('COMPLETED','CANCELLED','REFUNDED','NO_SHOW');
