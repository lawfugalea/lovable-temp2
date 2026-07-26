-- Let a shopping template refill a list on a schedule.
--
-- Templates already existed but had to be imported by hand every time, so the
-- weekly staples people buy without thinking were re-added by hand every week.
--
-- Every statement is additive. All new columns are nullable (or have a default),
-- so the ALTER TABLE is metadata-only: no table rewrite, no long lock, and no
-- existing row changes meaning. A template with recurrenceType NULL behaves
-- exactly as it did before this migration, which is every template that exists
-- at deploy time — nobody's list starts filling itself unexpectedly.
ALTER TABLE "ShoppingTemplate"
  ADD COLUMN "recurrenceType" "ChoreRecurrenceType",
  ADD COLUMN "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "intervalDays" INTEGER,
  ADD COLUMN "anchorDate" DATE,
  ADD COLUMN "dayOfMonth" INTEGER,
  ADD COLUMN "autoListId" TEXT,
  ADD COLUMN "lastRunOn" DATE;

-- ON DELETE SET NULL rather than CASCADE: deleting a shopping list must not
-- silently delete the template that fills it. Clearing the link stops the
-- schedule and leaves the template intact for manual import.
ALTER TABLE "ShoppingTemplate"
  ADD CONSTRAINT "ShoppingTemplate_autoListId_fkey"
  FOREIGN KEY ("autoListId") REFERENCES "ShoppingList"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- The worker scans for templates that have a schedule at all; without this it
-- would sequentially scan every template in the database on each run.
CREATE INDEX "ShoppingTemplate_recurrenceType_idx" ON "ShoppingTemplate"("recurrenceType");
