-- Household country (ISO 3166-1 alpha-2). Existing households are Maltese;
-- the column gates region-specific features such as supermarket price comparison.
ALTER TABLE "Household" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'MT';
