-- CreateEnum
CREATE TYPE "BankProvider" AS ENUM ('ENABLE_BANKING');

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'REAUTH_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM ('BOOKED', 'PENDING');

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "BankProvider" NOT NULL DEFAULT 'ENABLE_BANKING',
    "aspspName" TEXT NOT NULL,
    "aspspCountry" TEXT NOT NULL DEFAULT 'MT',
    "psuType" TEXT NOT NULL DEFAULT 'personal',
    "providerSessionId" TEXT,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncAttemptAt" TIMESTAMP(3),
    "syncStartedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAuthorizationAttempt" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" "BankProvider" NOT NULL DEFAULT 'ENABLE_BANKING',
    "aspspName" TEXT NOT NULL,
    "aspspCountry" TEXT NOT NULL DEFAULT 'MT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAuthorizationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "identificationHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "maskedIdentifier" TEXT,
    "currency" TEXT NOT NULL,
    "cashAccountType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountShare" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccountShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankBalance" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balanceType" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "referenceDate" DATE,
    "changedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "deduplicationKey" TEXT NOT NULL,
    "status" "BankTransactionStatus" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "bookingDate" DATE,
    "valueDate" DATE,
    "counterparty" TEXT,
    "description" TEXT,
    "providerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "BankConnection_providerSessionId_key" ON "BankConnection"("providerSessionId");
CREATE INDEX "BankConnection_userId_idx" ON "BankConnection"("userId");
CREATE INDEX "BankConnection_status_idx" ON "BankConnection"("status");
CREATE UNIQUE INDEX "BankAuthorizationAttempt_state_key" ON "BankAuthorizationAttempt"("state");
CREATE INDEX "BankAuthorizationAttempt_userId_expiresAt_idx" ON "BankAuthorizationAttempt"("userId", "expiresAt");
CREATE INDEX "BankAuthorizationAttempt_householdId_idx" ON "BankAuthorizationAttempt"("householdId");
CREATE UNIQUE INDEX "BankAccount_connectionId_identificationHash_key" ON "BankAccount"("connectionId", "identificationHash");
CREATE INDEX "BankAccount_connectionId_idx" ON "BankAccount"("connectionId");
CREATE UNIQUE INDEX "BankAccountShare_accountId_householdId_key" ON "BankAccountShare"("accountId", "householdId");
CREATE INDEX "BankAccountShare_householdId_idx" ON "BankAccountShare"("householdId");
CREATE INDEX "BankAccountShare_createdById_idx" ON "BankAccountShare"("createdById");
CREATE UNIQUE INDEX "BankBalance_accountId_balanceType_currency_key" ON "BankBalance"("accountId", "balanceType", "currency");
CREATE INDEX "BankBalance_accountId_idx" ON "BankBalance"("accountId");
CREATE UNIQUE INDEX "BankTransaction_accountId_deduplicationKey_key" ON "BankTransaction"("accountId", "deduplicationKey");
CREATE INDEX "BankTransaction_accountId_bookingDate_idx" ON "BankTransaction"("accountId", "bookingDate");
CREATE INDEX "BankTransaction_accountId_status_idx" ON "BankTransaction"("accountId", "status");

-- Foreign keys
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAuthorizationAttempt" ADD CONSTRAINT "BankAuthorizationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAuthorizationAttempt" ADD CONSTRAINT "BankAuthorizationAttempt_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAuthorizationAttempt" ADD CONSTRAINT "BankAuthorizationAttempt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccountShare" ADD CONSTRAINT "BankAccountShare_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccountShare" ADD CONSTRAINT "BankAccountShare_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccountShare" ADD CONSTRAINT "BankAccountShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankBalance" ADD CONSTRAINT "BankBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
