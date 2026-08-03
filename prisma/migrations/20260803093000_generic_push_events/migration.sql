-- Once-only ledger for event pushes (chores due, bank consent, shopping
-- refills). The unique dedupe key is the whole mechanism: the first worker run
-- to claim a key sends the notification, every retry and overlapping run
-- afterwards finds the row and stays quiet. Rows are swept by demo-cleanup
-- once they are too old to collide with a live key.
CREATE TABLE "PushEvent" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushEvent_dedupeKey_key" ON "PushEvent"("dedupeKey");

CREATE INDEX "PushEvent_createdAt_idx" ON "PushEvent"("createdAt");
