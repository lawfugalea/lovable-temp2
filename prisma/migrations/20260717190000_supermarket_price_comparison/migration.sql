-- Add structured shopping quantities and canonical catalogue identities.
ALTER TABLE "ShoppingItem"
  ADD COLUMN "quantityCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "canonicalProductId" TEXT;

ALTER TABLE "Store"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'PUBLIC_CATALOGUE',
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulSyncAt" TIMESTAMP(3),
  ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "syncError" TEXT;

UPDATE "Store"
SET "slug" = CASE
  WHEN "domain" LIKE '%smart.com.mt%' THEN 'smart'
  ELSE TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')) || '-' || LEFT("id", 6)
END;

ALTER TABLE "Store" ALTER COLUMN "slug" SET NOT NULL;

CREATE TABLE "CanonicalProduct" (
  "id" TEXT NOT NULL,
  "exactKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "brand" TEXT,
  "normalizedName" TEXT NOT NULL,
  "barcode" TEXT,
  "packageValue" DECIMAL(12,3),
  "packageUnit" TEXT,
  "packCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CanonicalProduct_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PriceProduct"
  ADD COLUMN "canonicalProductId" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "packageValue" DECIMAL(12,3),
  ADD COLUMN "packageUnit" TEXT,
  ADD COLUMN "packCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "missingSyncCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "matchSource" TEXT,
  ADD COLUMN "matchConfidence" INTEGER;

ALTER TABLE "PriceOffer"
  ADD COLUMN "regularPriceCents" INTEGER,
  ADD COLUMN "loyaltyPriceCents" INTEGER,
  ADD COLUMN "isPublicPromotion" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "unitPriceCents" INTEGER,
  ADD COLUMN "unitPriceUnit" TEXT;

CREATE TYPE "CatalogSyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "PriceSyncRun" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "status" "CatalogSyncStatus" NOT NULL DEFAULT 'RUNNING',
  "productsSeen" INTEGER NOT NULL DEFAULT 0,
  "offersChanged" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "PriceSyncRun_pkey" PRIMARY KEY ("id")
);

-- Preserve the existing Smart catalogue as one canonical identity per product.
INSERT INTO "CanonicalProduct" (
  "id", "exactKey", "displayName", "brand", "normalizedName", "packCount", "createdAt", "updatedAt"
)
SELECT
  'legacy_' || "id",
  'legacy:' || "id",
  "name",
  "brand",
  "nameNormalized",
  1,
  "createdAt",
  "updatedAt"
FROM "PriceProduct";

UPDATE "PriceProduct"
SET
  "canonicalProductId" = 'legacy_' || "id",
  "externalId" = COALESCE("sku", "id"),
  "lastSeenAt" = COALESCE(
    (SELECT MAX(o."scrapedAt") FROM "PriceOffer" o WHERE o."productId" = "PriceProduct"."id"),
    "updatedAt"
  ),
  "matchSource" = 'LEGACY',
  "matchConfidence" = 100;

-- Existing template product ids were never constrained; discard invalid values before adding the relation.
UPDATE "ShoppingTemplateItem" SET "productId" = NULL WHERE "productId" IS NOT NULL;

CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE UNIQUE INDEX "CanonicalProduct_exactKey_key" ON "CanonicalProduct"("exactKey");
CREATE UNIQUE INDEX "CanonicalProduct_barcode_key" ON "CanonicalProduct"("barcode");
CREATE INDEX "CanonicalProduct_normalizedName_idx" ON "CanonicalProduct"("normalizedName");
CREATE INDEX "CanonicalProduct_brand_normalizedName_idx" ON "CanonicalProduct"("brand", "normalizedName");
CREATE UNIQUE INDEX "PriceProduct_storeId_externalId_key" ON "PriceProduct"("storeId", "externalId");
CREATE INDEX "PriceProduct_canonicalProductId_active_idx" ON "PriceProduct"("canonicalProductId", "active");
CREATE INDEX "PriceProduct_barcode_idx" ON "PriceProduct"("barcode");
CREATE INDEX "PriceProduct_lastSeenAt_idx" ON "PriceProduct"("lastSeenAt");
CREATE INDEX "ShoppingItem_canonicalProductId_idx" ON "ShoppingItem"("canonicalProductId");
CREATE INDEX "ShoppingTemplateItem_productId_idx" ON "ShoppingTemplateItem"("productId");
CREATE INDEX "PriceSyncRun_storeId_startedAt_idx" ON "PriceSyncRun"("storeId", "startedAt");
CREATE INDEX "PriceSyncRun_status_startedAt_idx" ON "PriceSyncRun"("status", "startedAt");

ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_canonicalProductId_fkey"
  FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceProduct" ADD CONSTRAINT "PriceProduct_canonicalProductId_fkey"
  FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShoppingTemplateItem" ADD CONSTRAINT "ShoppingTemplateItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceSyncRun" ADD CONSTRAINT "PriceSyncRun_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
