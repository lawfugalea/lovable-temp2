-- CreateEnum
CREATE TYPE "FinancePatternMatchType" AS ENUM ('EXACT', 'CONTAINS');
CREATE TYPE "FinanceSubscriptionStatus" AS ENUM ('CANDIDATE', 'CONFIRMED', 'DISMISSED');
CREATE TYPE "FinanceCadence" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');
CREATE TYPE "FinanceLimitScope" AS ENUM ('CATEGORY', 'MERCHANT');
CREATE TYPE "FinanceCoachFeedbackState" AS ENUM ('DISMISSED', 'SNOOZED');

-- Account aliases are kept separately from the provider-controlled display name.
ALTER TABLE "BankAccount" ADD COLUMN "customName" TEXT;

CREATE TABLE "FinancePatternRule" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  "matchType" "FinancePatternMatchType" NOT NULL DEFAULT 'EXACT',
  "matchValue" TEXT NOT NULL,
  "merchantName" TEXT,
  "category" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancePatternRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceTransactionOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "merchantName" TEXT,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceTransactionOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "merchantKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" "FinanceSubscriptionStatus" NOT NULL DEFAULT 'CANDIDATE',
  "cadence" "FinanceCadence" NOT NULL,
  "intervalDays" INTEGER,
  "expectedAmount" DECIMAL(19,4),
  "amountTolerance" DECIMAL(19,4),
  "currency" TEXT NOT NULL,
  "nextExpectedDate" DATE,
  "reminderDays" INTEGER NOT NULL DEFAULT 3,
  "lastSeenAt" DATE,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "manual" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceLimit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  "scope" "FinanceLimitScope" NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceLimit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCoachFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  "signalKey" TEXT NOT NULL,
  "state" "FinanceCoachFeedbackState" NOT NULL,
  "snoozedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceCoachFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAiPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAiPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAiAnalysis" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "accountIds" JSONB NOT NULL,
  "payloadSummary" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceAiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancePatternRule_userId_enabled_idx" ON "FinancePatternRule"("userId", "enabled");
CREATE INDEX "FinancePatternRule_accountId_idx" ON "FinancePatternRule"("accountId");
CREATE UNIQUE INDEX "FinanceTransactionOverride_transactionId_key" ON "FinanceTransactionOverride"("transactionId");
CREATE INDEX "FinanceTransactionOverride_userId_idx" ON "FinanceTransactionOverride"("userId");
CREATE INDEX "FinanceTransactionOverride_accountId_idx" ON "FinanceTransactionOverride"("accountId");
CREATE UNIQUE INDEX "FinanceSubscription_accountId_merchantKey_key" ON "FinanceSubscription"("accountId", "merchantKey");
CREATE INDEX "FinanceSubscription_userId_status_idx" ON "FinanceSubscription"("userId", "status");
CREATE INDEX "FinanceSubscription_accountId_nextExpectedDate_idx" ON "FinanceSubscription"("accountId", "nextExpectedDate");
CREATE INDEX "FinanceLimit_userId_enabled_idx" ON "FinanceLimit"("userId", "enabled");
CREATE INDEX "FinanceLimit_accountId_idx" ON "FinanceLimit"("accountId");
CREATE UNIQUE INDEX "FinanceCoachFeedback_userId_signalKey_key" ON "FinanceCoachFeedback"("userId", "signalKey");
CREATE INDEX "FinanceCoachFeedback_accountId_idx" ON "FinanceCoachFeedback"("accountId");
CREATE UNIQUE INDEX "FinanceAiPreference_userId_key" ON "FinanceAiPreference"("userId");
CREATE UNIQUE INDEX "FinanceAiAnalysis_userId_inputHash_key" ON "FinanceAiAnalysis"("userId", "inputHash");
CREATE INDEX "FinanceAiAnalysis_userId_createdAt_idx" ON "FinanceAiAnalysis"("userId", "createdAt");
CREATE INDEX "FinanceAiAnalysis_expiresAt_idx" ON "FinanceAiAnalysis"("expiresAt");

ALTER TABLE "FinancePatternRule" ADD CONSTRAINT "FinancePatternRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePatternRule" ADD CONSTRAINT "FinancePatternRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceTransactionOverride" ADD CONSTRAINT "FinanceTransactionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceTransactionOverride" ADD CONSTRAINT "FinanceTransactionOverride_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceTransactionOverride" ADD CONSTRAINT "FinanceTransactionOverride_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceSubscription" ADD CONSTRAINT "FinanceSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceSubscription" ADD CONSTRAINT "FinanceSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceLimit" ADD CONSTRAINT "FinanceLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceLimit" ADD CONSTRAINT "FinanceLimit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceCoachFeedback" ADD CONSTRAINT "FinanceCoachFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceCoachFeedback" ADD CONSTRAINT "FinanceCoachFeedback_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAiPreference" ADD CONSTRAINT "FinanceAiPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAiAnalysis" ADD CONSTRAINT "FinanceAiAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
