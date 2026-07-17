-- Enforce the application's single-household membership model at the database
-- layer. Abort instead of discarding data if a legacy database contains
-- multiple memberships for one user; an operator must reconcile those rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Membership" GROUP BY "userId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one household per user while duplicate memberships exist';
  END IF;
END $$;

CREATE UNIQUE INDEX "Membership_userId_key" ON "Membership"("userId");

-- PageState previously carried an unchecked householdId. Remove only rows
-- whose parent no longer exists, then protect all future writes with a cascade.
DELETE FROM "PageState" page_state
WHERE NOT EXISTS (
  SELECT 1 FROM "Household" household WHERE household."id" = page_state."householdId"
);

ALTER TABLE "PageState" ADD CONSTRAINT "PageState_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Align deletion behavior with the application's household and account cleanup
-- semantics so partial failures cannot leave orphaned rows.
ALTER TABLE "Household" DROP CONSTRAINT "Household_ownerId_fkey";
ALTER TABLE "Household" ADD CONSTRAINT "Household_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_householdId_fkey";
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invite" DROP CONSTRAINT "Invite_householdId_fkey";
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShoppingItem" DROP CONSTRAINT "ShoppingItem_createdById_fkey";
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Child" DROP CONSTRAINT "Child_householdId_fkey";
ALTER TABLE "Child" ADD CONSTRAINT "Child_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicineDose" DROP CONSTRAINT "MedicineDose_childId_fkey";
ALTER TABLE "MedicineDose" ADD CONSTRAINT "MedicineDose_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicineDose" DROP CONSTRAINT "MedicineDose_medicineId_fkey";
ALTER TABLE "MedicineDose" ADD CONSTRAINT "MedicineDose_medicineId_fkey"
  FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicineReminder" DROP CONSTRAINT "MedicineReminder_childId_fkey";
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicineReminder" DROP CONSTRAINT "MedicineReminder_medicineId_fkey";
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_medicineId_fkey"
  FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
