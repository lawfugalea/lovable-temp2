-- Add safety guardrail fields to Medicine
ALTER TABLE "Medicine" ADD COLUMN "minGapHours" DOUBLE PRECISION;
ALTER TABLE "Medicine" ADD COLUMN "maxDosesPer24h" INTEGER;
ALTER TABLE "Medicine" ADD COLUMN "isPrn" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing "as needed" medicines become PRN
UPDATE "Medicine" SET "isPrn" = true WHERE lower(trim("frequency")) = 'as needed';
