-- Extensions (once per DB; keep here if your role can create them)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1) Add FTS column on "PriceProduct" (name + brand)
ALTER TABLE "PriceProduct"
  ADD COLUMN IF NOT EXISTS fts tsvector;

-- Backfill FTS
UPDATE "PriceProduct" p
SET fts =
  setweight(to_tsvector('simple', unaccent(coalesce(p.name, ''))), 'A')
  || setweight(to_tsvector('simple', unaccent(coalesce(p.brand, ''))), 'B');

-- Keep FTS fresh on inserts/updates
CREATE OR REPLACE FUNCTION priceproduct_fts_refresh() RETURNS trigger AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.name, ''))), 'A')
    || setweight(to_tsvector('simple', unaccent(coalesce(NEW.brand, ''))), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS priceproduct_fts_refresh_trg ON "PriceProduct";
CREATE TRIGGER priceproduct_fts_refresh_trg
BEFORE INSERT OR UPDATE ON "PriceProduct"
FOR EACH ROW EXECUTE FUNCTION priceproduct_fts_refresh();

-- 2) Indexes for speed
-- FTS on PriceProduct
CREATE INDEX IF NOT EXISTS priceproduct_fts_gin ON "PriceProduct" USING GIN (fts);

-- Trigram on name/brand/nameNormalized for typo tolerance & partials
CREATE INDEX IF NOT EXISTS priceproduct_name_trgm ON "PriceProduct" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS priceproduct_brand_trgm ON "PriceProduct" USING GIN (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS priceproduct_name_norm_trgm ON "PriceProduct" USING GIN ("nameNormalized" gin_trgm_ops);

-- Trigram on PriceOffer.category since filters/search may hit it
CREATE INDEX IF NOT EXISTS priceoffer_category_trgm ON "PriceOffer" USING GIN (category gin_trgm_ops);

-- Optional synonyms table (global or per-household if you want later)
CREATE TABLE IF NOT EXISTS search_synonym (
  id serial PRIMARY KEY,
  household_id text,
  term text NOT NULL,
  canonical text NOT NULL
);

INSERT INTO search_synonym (term, canonical) VALUES
('courgette','zucchini'),
('garbanzo','chickpeas'),
('garbanzo beans','chickpeas'),
('aubergine','eggplant')
ON CONFLICT DO NOTHING;
