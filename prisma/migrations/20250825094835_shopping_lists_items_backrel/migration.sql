-- CreateEnum
CREATE TYPE "public"."ShoppingItemStatus" AS ENUM ('ACTIVE', 'DONE');

-- CreateTable
CREATE TABLE "public"."ShoppingList" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShoppingItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "qty" TEXT,
    "notes" TEXT,
    "category" TEXT,
    "store" TEXT,
    "status" "public"."ShoppingItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "doneById" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingList_householdId_idx" ON "public"."ShoppingList"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_householdId_name_key" ON "public"."ShoppingList"("householdId", "name");

-- CreateIndex
CREATE INDEX "ShoppingItem_listId_idx" ON "public"."ShoppingItem"("listId");

-- CreateIndex
CREATE INDEX "ShoppingItem_status_idx" ON "public"."ShoppingItem"("status");

-- CreateIndex
CREATE INDEX "ShoppingItem_updatedAt_idx" ON "public"."ShoppingItem"("updatedAt");

-- AddForeignKey
ALTER TABLE "public"."ShoppingList" ADD CONSTRAINT "ShoppingList_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."ShoppingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
