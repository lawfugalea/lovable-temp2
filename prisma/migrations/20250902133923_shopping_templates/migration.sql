-- CreateTable
CREATE TABLE "public"."ShoppingTemplate" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShoppingTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unitId" TEXT,
    "categoryId" TEXT,
    "note" TEXT,

    CONSTRAINT "ShoppingTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingTemplate_householdId_idx" ON "public"."ShoppingTemplate"("householdId");

-- CreateIndex
CREATE INDEX "ShoppingTemplateItem_templateId_idx" ON "public"."ShoppingTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "ShoppingTemplateItem_unitId_idx" ON "public"."ShoppingTemplateItem"("unitId");

-- CreateIndex
CREATE INDEX "ShoppingTemplateItem_categoryId_idx" ON "public"."ShoppingTemplateItem"("categoryId");

-- AddForeignKey
ALTER TABLE "public"."ShoppingTemplateItem" ADD CONSTRAINT "ShoppingTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ShoppingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

