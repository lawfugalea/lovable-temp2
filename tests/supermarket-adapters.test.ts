import assert from 'node:assert/strict'
import test from 'node:test'

const {
  canonicalKey,
  eurosToCents,
  hasMoreGreensPages,
  isStorePermitted,
  mayUseGreensImages,
  parseHappyShopperProducts,
  parsePackage,
  parseWelbeesProducts,
} = require('../scripts/sync-supermarket-prices.js') as {
  canonicalKey: (product: Record<string, unknown>, pack: Record<string, unknown>, sourceKey?: string) => Record<string, unknown>
  eurosToCents: (value: unknown) => number | null
  hasMoreGreensPages: (rowCount: number, pageSize?: number) => boolean
  isStorePermitted: (slug: string, env?: Record<string, string>) => boolean
  mayUseGreensImages: (env?: Record<string, string>) => boolean
  parseHappyShopperProducts: (html: string) => Array<Record<string, unknown>>
  parsePackage: (value: string) => Record<string, unknown>
  parseWelbeesProducts: (html: string) => Array<Record<string, unknown>>
}

test('retailer permission gates default to the conservative setting', () => {
  assert.equal(isStorePermitted('greens', {}), true)
  assert.equal(isStorePermitted('pavipama', {}), false)
  assert.equal(isStorePermitted('pavipama', { PAVIPAMA_PERMISSION_CONFIRMED: 'true' }), true)
  assert.equal(mayUseGreensImages({}), false)
  assert.equal(mayUseGreensImages({ GREENS_IMAGE_USE_CONFIRMED: 'true' }), true)
})

test('Greens pagination trusts the returned rows instead of its inaccurate advertised total', () => {
  assert.equal(hasMoreGreensPages(250), true)
  assert.equal(hasMoreGreensPages(230), false)
  assert.equal(hasMoreGreensPages(0), false)
})

test('Happy Shopper fixture parses public Odoo product cards', () => {
  const html = `
    <form action="/shop/cart/update" class="oe_product_cart h-100 d-flex">
      <a itemprop="url" href="/shop/orsini-water-pack-x-6-1-5l-117011">
        <img src="/web/image/product.template/117011/image_512/water" itemprop="image" />
      </a>
      <a itemprop="name" href="/shop/orsini-water-pack-x-6-1-5l-117011" content="Orsini Water Pack x 6 1.5L">Water</a>
      <button data-product-template-id="117011" data-product-product-id="114119"></button>
      <span itemprop="price" style="display:none;">3.89</span>
      <span itemprop="priceCurrency" style="display:none;">EUR</span>
    </form>`
  const products = parseHappyShopperProducts(html)
  assert.equal(products.length, 1)
  assert.deepEqual({
    externalId: products[0].externalId,
    name: products[0].name,
    priceCents: products[0].priceCents,
    sourceUrl: products[0].sourceUrl,
  }, {
    externalId: '117011',
    name: 'Orsini Water Pack x 6 1.5L',
    priceCents: 389,
    sourceUrl: 'https://hs.mt/shop/orsini-water-pack-x-6-1-5l-117011',
  })
})

test('Welbees fixture keeps the public price separate from RRP', () => {
  const html = `
    <div class="select-none product-main-holder" data-product-code="0000012345">
      <div style="background-image: url('https://welbees.mt/product.jpg');"></div>
      <div class="font-body text-18 font-medium text-tertiary">&euro;0.89</div>
      <s>RRP &euro;0.99</s><div>&euro;2.22/kg</div>
      <h6 class="font-heading">Rosita Passata</h6>
      <div class="font-body text-14 leading-none font-light text-grey-dark inline-block mr-2">400grms</div>
    </div>`
  const products = parseWelbeesProducts(html)
  assert.equal(products.length, 1)
  assert.deepEqual({
    externalId: products[0].externalId,
    name: products[0].name,
    priceCents: products[0].priceCents,
    regularPriceCents: products[0].regularPriceCents,
  }, {
    externalId: '0000012345',
    name: 'Rosita Passata',
    priceCents: 89,
    regularPriceCents: 99,
  })
  assert.deepEqual(parsePackage(String(products[0].unit)), {
    packageValue: 400,
    packageUnit: 'G',
    packCount: 1,
  })
})

test('script matcher merges equivalent pack spellings but keeps weak identities store-specific', () => {
  const welbeesPack = parsePackage('Rosita Passata 400grms')
  const greensPack = parsePackage('Rosita Passata 400 g')
  const welbees = canonicalKey(
    { barcode: null, name: 'Rosita Passata', brand: 'Rosita' },
    welbeesPack,
    'welbees:123',
  )
  const greens = canonicalKey(
    { barcode: null, name: 'Rosita Passata 400g', brand: 'Rosita' },
    greensPack,
    'greens:456',
  )
  assert.equal(welbees.exactKey, greens.exactKey)

  const weakWelbees = canonicalKey({ barcode: null, name: 'Fresh tomatoes' }, parsePackage('Fresh tomatoes'), 'welbees:1')
  const weakGreens = canonicalKey({ barcode: null, name: 'Fresh tomatoes' }, parsePackage('Fresh tomatoes'), 'greens:1')
  assert.equal(weakWelbees.source, 'STORE_ONLY')
  assert.notEqual(weakWelbees.exactKey, weakGreens.exactKey)
})

test('script matcher uses the same conservative barcode and pack policy', () => {
  const pack = parsePackage('Benna Milk 500ml')
  assert.deepEqual(pack, { packageValue: 500, packageUnit: 'ML', packCount: 1 })
  const identity = canonicalKey({ barcode: '5350066200032', name: 'Benna Milk 500ml' }, pack)
  assert.deepEqual(identity, {
    exactKey: 'gtin:5350066200032', source: 'BARCODE', confidence: 100, barcode: '5350066200032',
  })
})

test('price parsing never turns missing retailer values into a free public price', () => {
  assert.equal(eurosToCents(null), null)
  assert.equal(eurosToCents(undefined), null)
  assert.equal(eurosToCents(''), null)
  assert.equal(eurosToCents('0.89'), 89)
})
