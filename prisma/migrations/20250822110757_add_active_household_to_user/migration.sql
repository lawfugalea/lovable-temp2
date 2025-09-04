-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "activeHouseholdId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_activeHouseholdId_fkey" FOREIGN KEY ("activeHouseholdId") REFERENCES "public"."Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
