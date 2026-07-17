-- Bring the database in line with the health and notes models that are already
-- used by the application. This migration intentionally leaves the custom
-- search_synonym table, PriceProduct.fts column, triggers, and GIN indexes alone.

-- App authentication normalizes email addresses. Enforce the same invariant in
-- PostgreSQL so differently-cased concurrent registrations cannot duplicate it.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User"(LOWER("email"));

-- Medicine templates and next-dose overrides were added to the Prisma model
-- after the original medicine migration. Scope every medicine to a household
-- so templates cannot leak between households.
ALTER TABLE "Medicine" ADD COLUMN "householdId" TEXT;
ALTER TABLE "Medicine" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Medicine" ADD COLUMN "nextDoseOverride" TIMESTAMP(3);
ALTER TABLE "Medicine" ADD COLUMN "overrideReason" TEXT;

UPDATE "Medicine" AS medicine
SET "householdId" = child."householdId"
FROM "Child" AS child
WHERE medicine."childId" = child."id";

ALTER TABLE "Medicine" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "Medicine" ALTER COLUMN "childId" DROP NOT NULL;

ALTER TABLE "Medicine" DROP CONSTRAINT "Medicine_childId_fkey";
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Medicine_householdId_idx" ON "Medicine"("householdId");
CREATE INDEX "Medicine_isTemplate_idx" ON "Medicine"("isTemplate");

-- Fever journal.
CREATE TABLE "FeverReading" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "temperature" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'C',
  "method" TEXT NOT NULL DEFAULT 'oral',
  "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "takenBy" TEXT,
  CONSTRAINT "FeverReading_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeverReading_childId_takenAt_idx" ON "FeverReading"("childId", "takenAt");
CREATE INDEX "FeverReading_takenAt_idx" ON "FeverReading"("takenAt");
ALTER TABLE "FeverReading" ADD CONSTRAINT "FeverReading_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notes and collaborators.
CREATE TYPE "NoteRole" AS ENUM ('VIEWER', 'EDITOR');

CREATE TABLE "Note" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentJson" JSONB,
  "contentText" TEXT,
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT NOT NULL DEFAULT 'yellow',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "householdId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NoteCollaborator" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "NoteRole" NOT NULL DEFAULT 'VIEWER',
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "addedById" TEXT NOT NULL,
  CONSTRAINT "NoteCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Note_createdById_idx" ON "Note"("createdById");
CREATE INDEX "Note_householdId_idx" ON "Note"("householdId");
CREATE INDEX "Note_isShared_idx" ON "Note"("isShared");
CREATE INDEX "Note_isPinned_idx" ON "Note"("isPinned");
CREATE INDEX "Note_isArchived_idx" ON "Note"("isArchived");
CREATE INDEX "Note_updatedAt_idx" ON "Note"("updatedAt");
CREATE INDEX "NoteCollaborator_noteId_idx" ON "NoteCollaborator"("noteId");
CREATE INDEX "NoteCollaborator_userId_idx" ON "NoteCollaborator"("userId");
CREATE UNIQUE INDEX "NoteCollaborator_noteId_userId_key" ON "NoteCollaborator"("noteId", "userId");

ALTER TABLE "Note" ADD CONSTRAINT "Note_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteCollaborator" ADD CONSTRAINT "NoteCollaborator_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteCollaborator" ADD CONSTRAINT "NoteCollaborator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteCollaborator" ADD CONSTRAINT "NoteCollaborator_addedById_fkey"
  FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make list and template deletion consistent with the UI's force-delete and
-- household-delete semantics.
ALTER TABLE "ShoppingItem" DROP CONSTRAINT "ShoppingItem_listId_fkey";
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShoppingList" DROP CONSTRAINT "ShoppingList_householdId_fkey";
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShoppingTemplate" ADD CONSTRAINT "ShoppingTemplate_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
