-- Store a household-wide aisle order without coupling it to any retailer.
ALTER TABLE "Household" ADD COLUMN "shoppingCategoryOrder" JSONB;
