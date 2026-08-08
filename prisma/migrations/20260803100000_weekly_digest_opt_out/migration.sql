-- The Monday digest email is on by default for household members; this is the
-- per-person way out of it.
ALTER TABLE "User" ADD COLUMN "weeklyDigestOptOut" BOOLEAN NOT NULL DEFAULT false;
