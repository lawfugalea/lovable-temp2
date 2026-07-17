-- Child health journal, structured medicine verification, and Web Push delivery.
CREATE TYPE "MedicineScheduleSource" AS ENUM ('PACKAGING', 'LEAFLET', 'CLINICIAN');
CREATE TYPE "PushDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

ALTER TABLE "Medicine"
  ADD COLUMN "activeIngredient" TEXT,
  ADD COLUMN "formulation" TEXT,
  ADD COLUMN "concentration" TEXT,
  ADD COLUMN "doseAmount" DOUBLE PRECISION,
  ADD COLUMN "doseUnit" TEXT,
  ADD COLUMN "scheduleSource" "MedicineScheduleSource",
  ADD COLUMN "scheduleSourceNotes" TEXT,
  ADD COLUMN "scheduleVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "scheduleVerifiedBy" TEXT,
  ADD COLUMN "episodeId" TEXT;

CREATE TABLE "HealthEpisode" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "isInferred" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HealthEpisode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeightMeasurement" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "weightKg" DOUBLE PRECISION NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "recordedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeightMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushDelivery" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "medicineId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MedicineDose"
  ADD COLUMN "episodeId" TEXT,
  ADD COLUMN "safetyWarnings" JSONB,
  ADD COLUMN "warningAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "warningAcknowledgedBy" TEXT,
  ADD COLUMN "warningReason" TEXT;

ALTER TABLE "FeverReading"
  ADD COLUMN "episodeId" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Infer historical episodes using a 72-hour quiet gap for each child.
CREATE TEMP TABLE "_HealthEventGroups" AS
WITH events AS (
  SELECT "childId", "takenAt" FROM "MedicineDose"
  UNION ALL
  SELECT "childId", "takenAt" FROM "FeverReading"
), marked AS (
  SELECT "childId", "takenAt",
    CASE
      WHEN lag("takenAt") OVER (PARTITION BY "childId" ORDER BY "takenAt") IS NULL THEN 1
      WHEN "takenAt" - lag("takenAt") OVER (PARTITION BY "childId" ORDER BY "takenAt") > interval '72 hours' THEN 1
      ELSE 0
    END AS new_group
  FROM events
), numbered AS (
  SELECT "childId", "takenAt",
    sum(new_group) OVER (PARTITION BY "childId" ORDER BY "takenAt" ROWS UNBOUNDED PRECEDING) AS group_no
  FROM marked
)
SELECT "childId", group_no, min("takenAt") AS "startedAt", max("takenAt") AS "endedAt"
FROM numbered
GROUP BY "childId", group_no;

INSERT INTO "HealthEpisode" (
  "id", "householdId", "childId", "title", "startedAt", "endedAt", "isInferred", "createdAt", "updatedAt"
)
SELECT
  'legacy_episode_' || md5(g."childId" || ':' || g.group_no::text),
  c."householdId",
  g."childId",
  'Imported illness episode',
  g."startedAt",
  g."endedAt",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_HealthEventGroups" g
JOIN "Child" c ON c."id" = g."childId";

UPDATE "MedicineDose" d
SET "episodeId" = e."id"
FROM "HealthEpisode" e
WHERE e."childId" = d."childId"
  AND e."isInferred" = true
  AND d."takenAt" BETWEEN e."startedAt" AND e."endedAt";

UPDATE "FeverReading" f
SET "episodeId" = e."id"
FROM "HealthEpisode" e
WHERE e."childId" = f."childId"
  AND e."isInferred" = true
  AND f."takenAt" BETWEEN e."startedAt" AND e."endedAt";

DROP TABLE "_HealthEventGroups";

ALTER TABLE "MedicineDose" ALTER COLUMN "episodeId" SET NOT NULL;
ALTER TABLE "FeverReading" ALTER COLUMN "episodeId" SET NOT NULL;

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE UNIQUE INDEX "PushDelivery_subscriptionId_medicineId_scheduledAt_key"
  ON "PushDelivery"("subscriptionId", "medicineId", "scheduledAt");
CREATE INDEX "HealthEpisode_householdId_startedAt_idx" ON "HealthEpisode"("householdId", "startedAt");
CREATE INDEX "HealthEpisode_childId_startedAt_idx" ON "HealthEpisode"("childId", "startedAt");
CREATE INDEX "WeightMeasurement_childId_measuredAt_idx" ON "WeightMeasurement"("childId", "measuredAt");
CREATE INDEX "PushSubscription_householdId_enabled_idx" ON "PushSubscription"("householdId", "enabled");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX "PushDelivery_status_scheduledAt_idx" ON "PushDelivery"("status", "scheduledAt");
CREATE INDEX "MedicineDose_episodeId_takenAt_idx" ON "MedicineDose"("episodeId", "takenAt");
CREATE INDEX "FeverReading_episodeId_takenAt_idx" ON "FeverReading"("episodeId", "takenAt");

ALTER TABLE "HealthEpisode" ADD CONSTRAINT "HealthEpisode_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthEpisode" ADD CONSTRAINT "HealthEpisode_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeightMeasurement" ADD CONSTRAINT "WeightMeasurement_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "HealthEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicineDose" ADD CONSTRAINT "MedicineDose_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "HealthEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeverReading" ADD CONSTRAINT "FeverReading_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "HealthEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_medicineId_fkey"
  FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
