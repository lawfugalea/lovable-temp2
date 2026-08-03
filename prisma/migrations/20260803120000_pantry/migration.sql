-- The pantry: what the household already has at home. Bridges meals and
-- shopping — meal-plan shopping generation skips ingredients found here, and
-- recipe suggestions can rank by pantry coverage. Matching is by normalized
-- name, the same case-insensitive identity the shopping refill worker uses.
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "quantity" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PantryItem_householdId_normalizedName_key" ON "PantryItem"("householdId", "normalizedName");

ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
