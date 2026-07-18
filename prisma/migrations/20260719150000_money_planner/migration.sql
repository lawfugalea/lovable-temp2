-- Household money planner: incomes, commitments, and savings goals.
CREATE TYPE "PlannerFrequency" AS ENUM ('WEEKLY', 'FOUR_WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'ANNUAL');

CREATE TABLE "IncomeSource" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "userId" TEXT,
  "label" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "frequency" "PlannerFrequency" NOT NULL DEFAULT 'MONTHLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Commitment" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "userId" TEXT,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'other',
  "amountCents" INTEGER NOT NULL,
  "frequency" "PlannerFrequency" NOT NULL DEFAULT 'MONTHLY',
  "essential" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavingsGoal" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetCents" INTEGER NOT NULL,
  "savedCents" INTEGER NOT NULL DEFAULT 0,
  "targetDate" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncomeSource_householdId_idx" ON "IncomeSource"("householdId");
CREATE INDEX "Commitment_householdId_idx" ON "Commitment"("householdId");
CREATE INDEX "SavingsGoal_householdId_idx" ON "SavingsGoal"("householdId");

ALTER TABLE "IncomeSource"
  ADD CONSTRAINT "IncomeSource_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncomeSource"
  ADD CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commitment"
  ADD CONSTRAINT "Commitment_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Commitment"
  ADD CONSTRAINT "Commitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavingsGoal"
  ADD CONSTRAINT "SavingsGoal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
