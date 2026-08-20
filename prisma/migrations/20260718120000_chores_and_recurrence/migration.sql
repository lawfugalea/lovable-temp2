-- Recurring household chores with per-occurrence completion tracking.
CREATE TYPE "ChoreRecurrenceType" AS ENUM ('WEEKLY', 'EVERY_N_DAYS', 'MONTHLY');
CREATE TYPE "ChoreCompletionStatus" AS ENUM ('DONE', 'SKIPPED');

CREATE TABLE "Chore" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "recurrenceType" "ChoreRecurrenceType" NOT NULL,
  "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "intervalDays" INTEGER,
  "anchorDate" DATE,
  "dayOfMonth" INTEGER,
  "assigneeId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChoreCompletion" (
  "id" TEXT NOT NULL,
  "choreId" TEXT NOT NULL,
  "dueDate" DATE NOT NULL,
  "status" "ChoreCompletionStatus" NOT NULL DEFAULT 'DONE',
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChoreCompletion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Chore_householdId_active_idx" ON "Chore"("householdId", "active");
CREATE UNIQUE INDEX "ChoreCompletion_choreId_dueDate_key" ON "ChoreCompletion"("choreId", "dueDate");
CREATE INDEX "ChoreCompletion_choreId_dueDate_idx" ON "ChoreCompletion"("choreId", "dueDate");

ALTER TABLE "Chore"
  ADD CONSTRAINT "Chore_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chore"
  ADD CONSTRAINT "Chore_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChoreCompletion"
  ADD CONSTRAINT "ChoreCompletion_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChoreCompletion"
  ADD CONSTRAINT "ChoreCompletion_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
