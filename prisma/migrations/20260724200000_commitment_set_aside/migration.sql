-- Set-asides become an explicit per-commitment choice instead of being inferred
-- from frequency. The backfill preserves exactly what each household already
-- sees: every commitment that is not billed monthly or weekly.
ALTER TABLE "Commitment" ADD COLUMN "setAside" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Commitment"
SET "setAside" = true
WHERE "frequency" NOT IN ('MONTHLY', 'WEEKLY');
