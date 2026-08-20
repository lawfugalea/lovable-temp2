-- Ephemeral demo accounts: flagged users with an expiry for automatic purge.
ALTER TABLE "User"
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "demoExpiresAt" TIMESTAMP(3);

CREATE INDEX "User_isDemo_demoExpiresAt_idx" ON "User"("isDemo", "demoExpiresAt");
