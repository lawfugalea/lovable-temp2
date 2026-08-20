-- Per-user first-run guidance state.
--
-- Previously the getting-started checklist stored its dismissal household-scoped
-- in PageState, so one member dismissing it hid the card for the whole household.
-- These columns are per-user. Every statement here is additive: no column is
-- dropped, no row is deleted, and all three columns are nullable with no default,
-- so the ALTER TABLE is metadata-only (no table rewrite, no long lock).

ALTER TABLE "User"
  ADD COLUMN "tourStepId" TEXT,
  ADD COLUMN "tourCompletedAt" TIMESTAMP(3),
  ADD COLUMN "checklistDismissedAt" TIMESTAMP(3);

-- Every account that exists at deploy time has already found its way around the
-- app. Mark the tour as settled for them so nobody who has been using ClanKeep
-- for months is ambushed by a coach mark on their next login. New signups get
-- NULL and see the tour on their first dashboard visit. Existing users can still
-- start it on demand from Settings, /help, or the command palette.
UPDATE "User" SET "tourCompletedAt" = CURRENT_TIMESTAMP;

-- Carry over the old household-scoped dismissal so nobody who already dismissed
-- the checklist sees it reappear. This over-applies to co-members of that
-- household who never dismissed it themselves — but that is exactly what the old
-- household-scoped behaviour already did, so it is a faithful carry-over rather
-- than a new regression. Those users can restore the card from /help.
UPDATE "User" u
SET "checklistDismissedAt" = ps."updatedAt"
FROM "PageState" ps
JOIN "Membership" m ON m."householdId" = ps."householdId"
WHERE ps."page" = 'onboarding'
  AND (ps."data" ->> 'dismissed') = 'true'
  AND m."userId" = u."id"
  AND u."checklistDismissedAt" IS NULL;
