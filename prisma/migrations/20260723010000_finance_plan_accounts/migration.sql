CREATE TYPE "FinancePlanAccountType" AS ENUM ('PERSONAL', 'HOUSEHOLD_SPENDING', 'COMMITMENTS', 'SAVINGS', 'OTHER');

CREATE TYPE "FinancePlanAccountVisibility" AS ENUM ('SHARED', 'PRIVATE');

ALTER TABLE "IncomeSource" ADD COLUMN "planAccountId" TEXT;
ALTER TABLE "Commitment" ADD COLUMN "planAccountId" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN "monthlyContributionCents" INTEGER;
ALTER TABLE "SavingsGoal" ADD COLUMN "planAccountId" TEXT;

CREATE TABLE "FinancePlanAccount" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancePlanAccountType" NOT NULL DEFAULT 'OTHER',
    "visibility" "FinancePlanAccountVisibility" NOT NULL DEFAULT 'SHARED',
    "monthlyBufferCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancePlanAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceFundingRule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "targetAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceFundingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceTransferCheckoff" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceTransferCheckoff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncomeSource_planAccountId_idx" ON "IncomeSource"("planAccountId");
CREATE INDEX "Commitment_planAccountId_idx" ON "Commitment"("planAccountId");
CREATE INDEX "SavingsGoal_planAccountId_idx" ON "SavingsGoal"("planAccountId");
CREATE INDEX "FinancePlanAccount_householdId_archivedAt_idx" ON "FinancePlanAccount"("householdId", "archivedAt");
CREATE INDEX "FinancePlanAccount_ownerUserId_idx" ON "FinancePlanAccount"("ownerUserId");
CREATE UNIQUE INDEX "FinanceFundingRule_sourceAccountId_targetAccountId_key" ON "FinanceFundingRule"("sourceAccountId", "targetAccountId");
CREATE INDEX "FinanceFundingRule_householdId_archivedAt_idx" ON "FinanceFundingRule"("householdId", "archivedAt");
CREATE INDEX "FinanceFundingRule_targetAccountId_idx" ON "FinanceFundingRule"("targetAccountId");
CREATE UNIQUE INDEX "FinanceTransferCheckoff_ruleId_period_key" ON "FinanceTransferCheckoff"("ruleId", "period");
CREATE INDEX "FinanceTransferCheckoff_period_idx" ON "FinanceTransferCheckoff"("period");
CREATE INDEX "FinanceTransferCheckoff_completedById_idx" ON "FinanceTransferCheckoff"("completedById");

ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_planAccountId_fkey" FOREIGN KEY ("planAccountId") REFERENCES "FinancePlanAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_planAccountId_fkey" FOREIGN KEY ("planAccountId") REFERENCES "FinancePlanAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_planAccountId_fkey" FOREIGN KEY ("planAccountId") REFERENCES "FinancePlanAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePlanAccount" ADD CONSTRAINT "FinancePlanAccount_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePlanAccount" ADD CONSTRAINT "FinancePlanAccount_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceFundingRule" ADD CONSTRAINT "FinanceFundingRule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceFundingRule" ADD CONSTRAINT "FinanceFundingRule_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "FinancePlanAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceFundingRule" ADD CONSTRAINT "FinanceFundingRule_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "FinancePlanAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceTransferCheckoff" ADD CONSTRAINT "FinanceTransferCheckoff_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "FinanceFundingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceTransferCheckoff" ADD CONSTRAINT "FinanceTransferCheckoff_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
