-- Restore valid legacy template links after canonical identities exist.
UPDATE "ShoppingTemplateItem" template_item
SET "productId" = 'legacy_' || backfill."priceProductId"
FROM "_ShoppingTemplateProductBackfill" backfill
WHERE template_item."id" = backfill."templateItemId"
  AND template_item."productId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "CanonicalProduct" canonical
    WHERE canonical."id" = 'legacy_' || backfill."priceProductId"
  );

DROP TABLE "_ShoppingTemplateProductBackfill";

UPDATE "PriceProduct" product
SET "sku" = backfill."sku"
FROM "_PriceProductSkuBackfill" backfill
WHERE product."id" = backfill."priceProductId";

DROP TABLE "_PriceProductSkuBackfill";
