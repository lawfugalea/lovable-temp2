import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  buildCanonicalExactKey,
  normalizeBarcode,
  normalizeProductDescription,
  parsePackageDescriptor,
} from '../src/lib/catalog-normalization'
import { safeRetailerSourceUrl } from '../src/lib/catalog-source-url'
import {
  buildBasketComparison,
  priceFreshness,
  type ComparisonItemInput,
} from '../src/lib/shopping-price-comparison'

const now = new Date('2026-07-17T12:00:00.000Z')
const stores = [
  { id: 'smart', name: 'Smart', slug: 'smart' },
  { id: 'greens', name: 'Greens', slug: 'greens' },
]

function offer(storeId: string, priceCents: number, observedAt = now.toISOString()) {
  const store = stores.find(candidate => candidate.id === storeId)!
  return {
    storeId,
    storeName: store.name,
    storeSlug: store.slug,
    productId: `${storeId}-product`,
    productName: 'Exact product 1L',
    priceCents,
    regularPriceCents: priceCents + 20,
    loyaltyPriceCents: priceCents - 30,
    sourceUrl: `https://example.test/${storeId}`,
    observedAt,
    available: true,
  }
}

test('package normalization converts common Malta catalogue sizes to base units', () => {
  assert.deepEqual(parsePackageDescriptor('Sparkling water 6 x 330ml'), {
    packageValue: 330,
    packageUnit: 'ML',
    packCount: 6,
  })
  assert.deepEqual(parsePackageDescriptor('Flour 1.5kg'), {
    packageValue: 1500,
    packageUnit: 'G',
    packCount: 1,
  })
  assert.equal(normalizeBarcode(' 5350-0662-0003-2 '), '5350066200032')
  assert.equal(normalizeBarcode('5350066200033'), null)
  assert.equal(normalizeBarcode('123'), null)
  assert.equal(normalizeProductDescription('Brand Pasta 500 g'), 'brand pasta')
  assert.equal(normalizeProductDescription('Special K 500g'), 'special k')
})

test('canonical keys prefer GTIN and keep exact text packs distinct', () => {
  const barcode = buildCanonicalExactKey({ barcode: '5350066200032', name: 'Benna Milk 500ml' })
  assert.deepEqual(barcode, { exactKey: 'gtin:5350066200032', source: 'BARCODE', confidence: 100 })

  const small = buildCanonicalExactKey({ name: 'Brand Pasta 500g', brand: 'Brand' })
  const sameSmall = buildCanonicalExactKey({ name: 'Brand Pasta 500 g', brand: 'Brand' })
  const large = buildCanonicalExactKey({ name: 'Brand Pasta 1kg', brand: 'Brand' })
  assert.equal(small.exactKey, sameSmall.exactKey)
  assert.notEqual(small.exactKey, large.exactKey)

  const weakA = buildCanonicalExactKey({ name: 'Fresh tomatoes', sourceKey: 'smart:1' })
  const weakB = buildCanonicalExactKey({ name: 'Fresh tomatoes', sourceKey: 'greens:1' })
  assert.equal(weakA.source, 'STORE_ONLY')
  assert.notEqual(weakA.exactKey, weakB.exactKey)
})

test('retailer source links reject foreign hosts and executable protocols', () => {
  assert.equal(
    safeRetailerSourceUrl('javascript:alert(1)', 'smart'),
    'http://www.smart.com.mt/forms/Products.aspx',
  )
  assert.equal(
    safeRetailerSourceUrl('https://evil.example/product', 'greens'),
    'https://www.greens.com.mt/products',
  )
  assert.equal(safeRetailerSourceUrl('https://welbees.mt/shop?id=1', 'welbees'), 'https://welbees.mt/shop?id=1')
  assert.equal(
    safeRetailerSourceUrl('https://hs.mt/shop/product-117011', 'happyshopper'),
    'https://hs.mt/shop/product-117011',
  )
})

test('basket comparison multiplies structured counts and ranks only complete stores', () => {
  const items: ComparisonItemInput[] = [
    {
      id: 'milk', title: 'Milk', quantityCount: 2, canonicalProductId: 'milk-product',
      offers: [offer('smart', 100), offer('greens', 90)],
    },
    {
      id: 'bread', title: 'Bread', quantityCount: 1, canonicalProductId: 'bread-product',
      offers: [offer('smart', 150)],
    },
  ]

  const result = buildBasketComparison(items, stores, now)
  assert.deepEqual(result.completeStores.map(store => [store.storeId, store.totalCents]), [['smart', 350]])
  assert.deepEqual(result.incompleteStores.map(store => [store.storeId, store.coverageCount]), [['greens', 1]])
  assert.equal(result.mixed.totalCents, 330)
  assert.equal(result.mixed.complete, true)
  assert.equal(result.mixed.stores.find(store => store.storeId === 'greens')?.subtotalCents, 180)
})

test('stale, expired, unavailable, and unmatched items never count as complete coverage', () => {
  const staleAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const expiredAt = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
  assert.equal(priceFreshness(staleAt, now), 'STALE')
  assert.equal(priceFreshness(expiredAt, now), 'EXPIRED')

  const result = buildBasketComparison([
    { id: 'stale', title: 'Stale', quantityCount: 1, canonicalProductId: 'stale-product', offers: [offer('smart', 100, staleAt)] },
    { id: 'unmatched', title: 'Unmatched', quantityCount: 1, canonicalProductId: null, offers: [] },
  ], stores, now)

  assert.equal(result.completeStores.length, 0)
  assert.equal(result.mixed.complete, false)
  assert.equal(result.mixed.coverageCount, 0)
  assert.equal(result.items[0].matchStatus, 'NO_CURRENT_OFFERS')
  assert.equal(result.items[1].matchStatus, 'UNMATCHED')
})

test('comparison migration adds relations without changing existing price cents semantics', () => {
  const migration = fs.readFileSync(path.join(
    process.cwd(),
    'prisma/migrations/20260717190000_supermarket_price_comparison/migration.sql',
  ), 'utf8')
  assert.match(migration, /ADD COLUMN "quantityCount" INTEGER NOT NULL DEFAULT 1/)
  assert.match(migration, /ShoppingItem_canonicalProductId_fkey[\s\S]*ON DELETE SET NULL/)
  assert.match(migration, /PriceSyncRun_storeId_fkey[\s\S]*ON DELETE CASCADE/)
  assert.doesNotMatch(migration, /DROP TABLE "PriceProduct"/)

  const preparation = fs.readFileSync(path.join(
    process.cwd(),
    'prisma/migrations/20260717185900_prepare_supermarket_price_comparison/migration.sql',
  ), 'utf8')
  const restoration = fs.readFileSync(path.join(
    process.cwd(),
    'prisma/migrations/20260717200000_restore_supermarket_template_links/migration.sql',
  ), 'utf8')
  assert.match(preparation, /_ShoppingTemplateProductBackfill/)
  assert.match(preparation, /UPDATE "PriceProduct" SET "sku" = NULL/)
  assert.match(restoration, /SET "productId" = 'legacy_' \|\| backfill\."priceProductId"/)
})
