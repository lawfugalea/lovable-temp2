-- The planning accounts become savings pots: a balance and what goes in each month.
-- Payday transfers, their monthly tick-offs, and account assignment for income and
-- commitments are all removed; goals keep their link so they can mark a target.

ALTER TABLE "FinancePlanAccount" ADD COLUMN "monthlyContributionCents" INTEGER NOT NULL DEFAULT 0;

-- Carry over the only per-account monthly figure that existed, so nothing typed in is lost.
UPDATE "FinancePlanAccount" SET "monthlyContributionCents" = "monthlyBufferCents" WHERE "monthlyBufferCents" > 0;

DROP TABLE "FinanceTransferCheckoff";
DROP TABLE "FinanceFundingRule";

ALTER TABLE "FinancePlanAccount" DROP COLUMN "monthlyBufferCents";
ALTER TABLE "FinancePlanAccount" DROP COLUMN "type";
DROP TYPE "FinancePlanAccountType";

-- Income and commitments belong to the plan, not to a pot. The entries themselves are
-- untouched; only the link to an account goes.
ALTER TABLE "IncomeSource" DROP CONSTRAINT "IncomeSource_planAccountId_fkey";
ALTER TABLE "Commitment" DROP CONSTRAINT "Commitment_planAccountId_fkey";
DROP INDEX "IncomeSource_planAccountId_idx";
DROP INDEX "Commitment_planAccountId_idx";
ALTER TABLE "IncomeSource" DROP COLUMN "planAccountId";
ALTER TABLE "Commitment" DROP COLUMN "planAccountId";
