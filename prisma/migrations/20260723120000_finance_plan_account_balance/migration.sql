ALTER TABLE "FinancePlanAccount" ADD COLUMN "openingBalanceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FinancePlanAccount" ADD COLUMN "openingBalanceAt" DATE;
