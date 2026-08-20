-- Preserve supported legacy template links across the canonical-product migration.
CREATE TABLE "_ShoppingTemplateProductBackfill" (
  "templateItemId" TEXT NOT NULL,
  "priceProductId" TEXT NOT NULL,
  CONSTRAINT "_ShoppingTemplateProductBackfill_pkey" PRIMARY KEY ("templateItemId")
);

INSERT INTO "_ShoppingTemplateProductBackfill" ("templateItemId", "priceProductId")
SELECT template_item."id", product."id"
FROM "ShoppingTemplateItem" template_item
JOIN "PriceProduct" product ON product."id" = template_item."productId";

-- Legacy SKU values were not constrained to be unique. Temporarily clear them
-- so the following migration always seeds externalId from the stable row id.
CREATE TABLE "_PriceProductSkuBackfill" (
  "priceProductId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  CONSTRAINT "_PriceProductSkuBackfill_pkey" PRIMARY KEY ("priceProductId")
);

INSERT INTO "_PriceProductSkuBackfill" ("priceProductId", "sku")
SELECT "id", "sku"
FROM "PriceProduct"
WHERE "sku" IS NOT NULL;

UPDATE "PriceProduct" SET "sku" = NULL WHERE "sku" IS NOT NULL;
