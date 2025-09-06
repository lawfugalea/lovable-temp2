-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('FIFTEEN_MINUTES', 'FIVE_MINUTES', 'DUE_NOW');

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineDose" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "dosage" TEXT NOT NULL,
    "notes" TEXT,
    "takenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineReminder" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Child_householdId_idx" ON "Child"("householdId");

-- CreateIndex
CREATE INDEX "Medicine_childId_idx" ON "Medicine"("childId");

-- CreateIndex
CREATE INDEX "Medicine_isActive_idx" ON "Medicine"("isActive");

-- CreateIndex
CREATE INDEX "MedicineDose_childId_takenAt_idx" ON "MedicineDose"("childId", "takenAt");

-- CreateIndex
CREATE INDEX "MedicineDose_medicineId_idx" ON "MedicineDose"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineDose_takenAt_idx" ON "MedicineDose"("takenAt");

-- CreateIndex
CREATE INDEX "MedicineReminder_childId_scheduledAt_idx" ON "MedicineReminder"("childId", "scheduledAt");

-- CreateIndex
CREATE INDEX "MedicineReminder_medicineId_idx" ON "MedicineReminder"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineReminder_scheduledAt_isActive_idx" ON "MedicineReminder"("scheduledAt", "isActive");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDose" ADD CONSTRAINT "MedicineDose_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDose" ADD CONSTRAINT "MedicineDose_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
