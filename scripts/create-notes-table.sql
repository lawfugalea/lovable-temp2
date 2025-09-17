-- Create Notes table migration
-- Run this SQL directly in your PostgreSQL database

CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL DEFAULT '[]',
    "color" TEXT NOT NULL DEFAULT 'default',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'HOUSEHOLD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Note_householdId_idx" ON "Note"("householdId");
CREATE INDEX IF NOT EXISTS "Note_ownerId_idx" ON "Note"("ownerId");
CREATE INDEX IF NOT EXISTS "Note_isPinned_idx" ON "Note"("isPinned");
CREATE INDEX IF NOT EXISTS "Note_visibility_idx" ON "Note"("visibility");
CREATE INDEX IF NOT EXISTS "Note_updatedAt_idx" ON "Note"("updatedAt");

-- Add foreign key constraints
ALTER TABLE "Note" ADD CONSTRAINT "Note_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add check constraint for visibility
ALTER TABLE "Note" ADD CONSTRAINT "Note_visibility_check" CHECK ("visibility" IN ('PRIVATE', 'HOUSEHOLD', 'READ_ONLY'));
