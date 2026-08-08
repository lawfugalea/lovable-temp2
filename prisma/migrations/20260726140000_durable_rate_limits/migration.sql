-- Move abuse counters out of process memory.
--
-- Login throttling lived in a module-level Map, which meant the counters reset
-- on every deploy and were counted per process — two app containers would have
-- allowed twice the intended attempts. Neither is acceptable for the control
-- that limits password guessing.
--
-- Purely additive: one new table, nothing existing is read or modified.
CREATE TABLE "RateLimitCounter" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);

-- Supports the periodic sweep of windows that have already elapsed. Without it
-- the sweep would scan the whole table.
CREATE INDEX "RateLimitCounter_resetAt_idx" ON "RateLimitCounter"("resetAt");
