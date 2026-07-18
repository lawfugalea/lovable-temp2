-- Freemium billing: per-household plan driven by Stripe webhooks or admin override.
CREATE TYPE "HouseholdPlan" AS ENUM ('FREE', 'FAMILY');
CREATE TYPE "PlanSource" AS ENUM ('STRIPE', 'ADMIN');

ALTER TABLE "Household"
  ADD COLUMN "plan" "HouseholdPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "planSource" "PlanSource",
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripeSubscriptionStatus" TEXT,
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "graceUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "Household_stripeCustomerId_key" ON "Household"("stripeCustomerId");
CREATE UNIQUE INDEX "Household_stripeSubscriptionId_key" ON "Household"("stripeSubscriptionId");

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- Grandfather the current live deployment: the household of the existing
-- finance owner keeps the full feature set as an admin comp, so enforcement
-- and entitlement land atomically without breaking live access.
UPDATE "Household" SET "plan" = 'FAMILY', "planSource" = 'ADMIN'
WHERE "id" IN (
  SELECT m."householdId" FROM "Membership" m
  JOIN "User" u ON u."id" = m."userId"
  WHERE lower(u."email") = 'lawfinuu@gmail.com'
);
