-- Apple subscriptions bought inside the iOS app, brokered by RevenueCat.
--
-- Additive only. The Stripe columns are untouched, because a household may have
-- subscribed on either platform and the entitlement check reads whichever is in
-- good standing. An existing Stripe subscriber is unaffected by this migration.
ALTER TYPE "PlanSource" ADD VALUE IF NOT EXISTS 'APPLE';

-- The RevenueCat app user id we log in with, which is our own User.id. Unique so
-- one purchaser cannot silently entitle two households.
ALTER TABLE "Household" ADD COLUMN "appleAppUserId" TEXT;
-- Apple's stable identifier for the subscription across renewals. Unique so a
-- replayed or duplicated webhook cannot grant a second household.
ALTER TABLE "Household" ADD COLUMN "appleOriginalTransactionId" TEXT;
ALTER TABLE "Household" ADD COLUMN "appleSubscriptionStatus" TEXT;
ALTER TABLE "Household" ADD COLUMN "appleProductId" TEXT;
ALTER TABLE "Household" ADD COLUMN "appleExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Household_appleAppUserId_key" ON "Household"("appleAppUserId");
CREATE UNIQUE INDEX "Household_appleOriginalTransactionId_key" ON "Household"("appleOriginalTransactionId");
