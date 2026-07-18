-- Meal planner: household recipes with ingredients and a dated dinner plan.
CREATE TYPE "MealSlot" AS ENUM ('DINNER');

CREATE TABLE "Recipe" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "servings" INTEGER NOT NULL DEFAULT 4,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeIngredient" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
  "unit" TEXT,
  "canonicalProductId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealPlanEntry" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "slot" "MealSlot" NOT NULL DEFAULT 'DINNER',
  "recipeId" TEXT,
  "freeText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MealPlanEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Recipe_householdId_name_key" ON "Recipe"("householdId", "name");
CREATE INDEX "Recipe_householdId_idx" ON "Recipe"("householdId");
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");
CREATE UNIQUE INDEX "MealPlanEntry_householdId_date_slot_key" ON "MealPlanEntry"("householdId", "date", "slot");
CREATE INDEX "MealPlanEntry_householdId_date_idx" ON "MealPlanEntry"("householdId", "date");

ALTER TABLE "Recipe"
  ADD CONSTRAINT "Recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient"
  ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient"
  ADD CONSTRAINT "RecipeIngredient_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealPlanEntry"
  ADD CONSTRAINT "MealPlanEntry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlanEntry"
  ADD CONSTRAINT "MealPlanEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
