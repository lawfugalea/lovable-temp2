-- Household activity feed: one row per notable action, written best-effort by
-- the mutating routes and read newest-first on the dashboard. Doubles as a
-- lightweight audit trail ("who changed this"), so rows keep the actor id.
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityEvent_householdId_createdAt_idx" ON "ActivityEvent"("householdId", "createdAt");

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The actor outlives their account deletion in the household's history only as
-- a null; the row itself stays because it describes the household, not them.
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
