-- Chores can carry an icon. The stored value is a semantic id from
-- src/lib/chore-icons.ts ("hoover", "dishes") and never a lucide component
-- name, so the icon a household picked survives an icon-library change.
--
-- NULL means "infer from the title", which is what every existing chore does —
-- hence no backfill. Additive only, and easy to reverse later if ever needed.
ALTER TABLE "Chore" ADD COLUMN "icon" TEXT;
