/* Daily, conservative supermarket catalogue synchronization. */
const { spawn } = require('node:child_process');
const { prisma } = require('./prisma');

const REQUEST_DELAY_MS = Math.max(0, Number(process.env.CATALOG_REQUEST_DELAY_MS || 250));
const STORE_FILTER = new Set(
  String(process.env.CATALOG_SYNC_STORES || 'smart,welbees')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
);

function isStorePermitted(slug, env = process.env) {
  if (slug !== 'pavipama') return true;
  return String(env.PAVIPAMA_PERMISSION_CONFIRMED || '').toLowerCase() === 'true';
}

function mayUseGreensImages(env = process.env) {
  return String(env.GREENS_IMAGE_USE_CONFIRMED || '').toLowerCase() === 'true';
}

function hasMoreGreensPages(rowCount, pageSize = 250) {
  return rowCount >= pageSize;
}

const stores = [
  { slug: 'smart', name: 'Smart Supermarket', domain: 'www.smart.com.mt', sourceType: 'PUBLIC_HTML' },
  { slug: 'greens', name: 'Greens Supermarket', domain: 'www.greens.com.mt', sourceType: 'PUBLIC_API' },
  { slug: 'welbees', name: "Welbee's", domain: 'welbees.mt', sourceType: 'PUBLIC_HTML' },
  { slug: 'pavipama', name: 'PAVI/PAMA', domain: 'pavipama.com.mt', sourceType: 'PUBLIC_API' },
  { slug: 'happyshopper', name: 'Happy Shopper', domain: 'hs.mt', sourceType: 'PUBLIC_HTML' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchText(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'HouseFlowPriceSync/1.0 (+self-hosted household catalogue comparison)',
          Accept: 'text/html,application/json',
          ...(options.headers || {}),
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options));
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PACKAGE_UNIT_PATTERN = 'kg|kgs|kilograms?|g|gr|grm|grms|grams?|l|lt|ltr|ltrs|litres?|cl|ml|pcs?|pieces?|tabs?|caps?';

function normalizeProductDescription(value) {
  return normalizeText(String(value || '')
    .replace(new RegExp(`\\b\\d+\\s*[x×]\\s*\\d+(?:[.,]\\d+)?\\s*(?:${PACKAGE_UNIT_PATTERN})\\b`, 'gi'), ' ')
    .replace(new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s*(?:${PACKAGE_UNIT_PATTERN})\\b`, 'gi'), ' '));
}

function normalizeBarcode(value) {
  const barcode = String(value || '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(barcode.length)) return null;
  const body = barcode.slice(0, -1);
  const expectedCheckDigit = Number(barcode.at(-1));
  const sum = Array.from(body).reverse().reduce((total, digit, index) => (
    total + Number(digit) * (index % 2 === 0 ? 3 : 1)
  ), 0);
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === expectedCheckDigit ? barcode : null;
}

function parsePackage(value, explicitValue, explicitUnit, explicitPackCount) {
  if (Number.isFinite(explicitValue) && explicitValue > 0 && explicitUnit) {
    const unit = String(explicitUnit).toUpperCase();
    if (['KG', 'KGS', 'KILOGRAM', 'KILOGRAMS'].includes(unit)) return { packageValue: explicitValue * 1000, packageUnit: 'G', packCount: explicitPackCount || 1 };
    if (['L', 'LT', 'LTR', 'LTRS', 'LITRE', 'LITRES'].includes(unit)) return { packageValue: explicitValue * 1000, packageUnit: 'ML', packCount: explicitPackCount || 1 };
    if (unit === 'CL') return { packageValue: explicitValue * 10, packageUnit: 'ML', packCount: explicitPackCount || 1 };
    if (['G', 'GR', 'GRM', 'GRMS', 'GRAM', 'GRAMS'].includes(unit)) return { packageValue: explicitValue, packageUnit: 'G', packCount: explicitPackCount || 1 };
    if (unit === 'ML') return { packageValue: explicitValue, packageUnit: 'ML', packCount: explicitPackCount || 1 };
    if (['EA', 'EACH', 'PZ', 'PC', 'PCS'].includes(unit)) return { packageValue: explicitValue, packageUnit: 'EA', packCount: explicitPackCount || 1 };
  }

  const normalized = String(value || '').toLowerCase().replace(/,/g, '.');
  const multi = normalized.match(new RegExp(`(\\d+)\\s*[x×]\\s*(\\d+(?:\\.\\d+)?)\\s*(${PACKAGE_UNIT_PATTERN})`, 'i'));
  const single = normalized.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${PACKAGE_UNIT_PATTERN})\\b`, 'i'));
  const match = multi || single;
  if (!match) return { packageValue: null, packageUnit: null, packCount: 1 };
  const packCount = multi ? Number(multi[1]) : 1;
  const rawValue = Number(multi ? multi[2] : single[1]);
  const unit = String(multi ? multi[3] : single[2]).toLowerCase();
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(unit)) return { packageValue: rawValue * 1000, packageUnit: 'G', packCount };
  if (['g', 'gr', 'grm', 'grms', 'gram', 'grams'].includes(unit)) return { packageValue: rawValue, packageUnit: 'G', packCount };
  if (['l', 'lt', 'ltr', 'ltrs', 'litre', 'litres'].includes(unit)) return { packageValue: rawValue * 1000, packageUnit: 'ML', packCount };
  if (unit === 'cl') return { packageValue: rawValue * 10, packageUnit: 'ML', packCount };
  if (unit === 'ml') return { packageValue: rawValue, packageUnit: 'ML', packCount };
  return { packageValue: rawValue, packageUnit: 'EA', packCount };
}

function canonicalKey(product, pack, sourceKey) {
  const barcode = normalizeBarcode(product.barcode);
  if (barcode) return { exactKey: `gtin:${barcode}`, source: 'BARCODE', confidence: 100, barcode };
  const packageKey = pack.packageValue == null
    ? 'unknown'
    : `${pack.packCount}x${pack.packageValue}${pack.packageUnit}`;
  const brand = normalizeText(product.brand);
  if (!brand || pack.packageValue == null || !pack.packageUnit) {
    const normalizedSourceKey = normalizeText(sourceKey);
    return {
      exactKey: `store:${normalizedSourceKey || normalizeText(product.name)}:${packageKey}`,
      source: 'STORE_ONLY',
      confidence: 0,
      barcode: null,
    };
  }
  return {
    exactKey: `text:${brand}:${normalizeProductDescription(product.name)}:${packageKey}`,
    source: 'EXACT_TEXT',
    confidence: 95,
    barcode: null,
  };
}

function eurosToCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&euro;/gi, '€')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ensureStore(config) {
  return prisma.store.upsert({
    where: { domain: config.domain },
    update: { name: config.name, slug: config.slug, sourceType: config.sourceType, enabled: true },
    create: { ...config, enabled: true },
  });
}

function recordCanonicalTransition(transitions, oldCanonicalProductId, newCanonicalProductId) {
  if (!oldCanonicalProductId || oldCanonicalProductId === newCanonicalProductId) return;
  const targets = transitions.get(oldCanonicalProductId) || new Set();
  targets.add(newCanonicalProductId);
  transitions.set(oldCanonicalProductId, targets);
}

async function remapOrphanedCanonicalReferences(transitions) {
  for (const [oldCanonicalProductId, targets] of transitions) {
    if (targets.size !== 1) continue;
    const remainingProducts = await prisma.priceProduct.count({
      where: { canonicalProductId: oldCanonicalProductId },
    });
    if (remainingProducts !== 0) continue;
    const [newCanonicalProductId] = targets;
    await prisma.$transaction([
      prisma.shoppingItem.updateMany({
        where: { canonicalProductId: oldCanonicalProductId },
        data: { canonicalProductId: newCanonicalProductId },
      }),
      prisma.shoppingTemplateItem.updateMany({
        where: { productId: oldCanonicalProductId },
        data: { productId: newCanonicalProductId },
      }),
    ]);
  }
}

async function ingestProduct(store, product, observedAt, transitions) {
  const pack = parsePackage(
    `${product.name} ${product.unit || ''}`,
    product.packageValue,
    product.packageUnit,
    product.packCount,
  );
  const identity = canonicalKey(product, pack, `${store.slug}:${product.externalId}`);
  const normalizedName = normalizeText(product.name);
  const canonical = await prisma.canonicalProduct.upsert({
    where: { exactKey: identity.exactKey },
    update: {
      displayName: product.name,
      brand: product.brand || undefined,
      normalizedName,
      barcode: identity.barcode || undefined,
      packageValue: pack.packageValue,
      packageUnit: pack.packageUnit,
      packCount: pack.packCount,
    },
    create: {
      exactKey: identity.exactKey,
      displayName: product.name,
      brand: product.brand || null,
      normalizedName,
      barcode: identity.barcode,
      packageValue: pack.packageValue,
      packageUnit: pack.packageUnit,
      packCount: pack.packCount,
    },
  });

  const existing = await prisma.priceProduct.findFirst({
    where: {
      OR: [
        { sourceUrl: product.sourceUrl },
        { storeId: store.id, externalId: product.externalId },
      ],
    },
    select: { id: true, canonicalProductId: true },
  });
  const data = {
    storeId: store.id,
    canonicalProductId: canonical.id,
    externalId: product.externalId,
    name: product.name,
    brand: product.brand || null,
    barcode: identity.barcode,
    sku: product.sku || null,
    sourceUrl: product.sourceUrl,
    imageUrl: product.imageUrl || null,
    nameNormalized: normalizedName,
    packageValue: pack.packageValue,
    packageUnit: pack.packageUnit,
    packCount: pack.packCount,
    active: product.available !== false,
    lastSeenAt: observedAt,
    missingSyncCount: 0,
    matchSource: identity.source,
    matchConfidence: identity.confidence,
  };
  const next = {
    priceCents: product.priceCents,
    regularPriceCents: product.regularPriceCents ?? product.priceCents,
    loyaltyPriceCents: product.loyaltyPriceCents ?? null,
    available: product.available !== false,
    unitPriceCents: product.unitPriceCents ?? null,
    unitPriceUnit: product.unitPriceUnit ?? null,
  };
  const { changed } = await prisma.$transaction(async tx => {
    const stored = existing
      ? await tx.priceProduct.update({ where: { id: existing.id }, data })
      : await tx.priceProduct.create({ data });
    const latest = await tx.priceOffer.findFirst({
      where: { productId: stored.id },
      orderBy: { scrapedAt: 'desc' },
      select: {
        priceCents: true,
        regularPriceCents: true,
        loyaltyPriceCents: true,
        available: true,
        unitPriceCents: true,
        unitPriceUnit: true,
      },
    });
    const changed = !latest || Object.keys(next).some(key => latest[key] !== next[key]);
    if (changed) {
      await tx.priceOffer.create({
        data: {
          productId: stored.id,
          storeId: store.id,
          ...next,
          isPublicPromotion: Boolean(next.regularPriceCents > next.priceCents),
          currency: 'EUR',
          unit: product.unit || null,
          category: product.category || null,
          scrapedAt: observedAt,
        },
      });
    }
    return { changed };
  });
  recordCanonicalTransition(transitions, existing?.canonicalProductId, canonical.id);
  return changed;
}

async function ingestCatalogue(store, products, observedAt, complete) {
  const previousActiveCount = await prisma.priceProduct.count({
    where: { storeId: store.id, active: true },
  });
  if (complete && previousActiveCount >= 100 && products.length < Math.ceil(previousActiveCount * 0.6)) {
    throw new Error(`Catalogue safety check rejected ${products.length} products; ${previousActiveCount} were previously active`);
  }
  let offersChanged = 0;
  const transitions = new Map();
  try {
    for (let offset = 0; offset < products.length; offset += 25) {
      const batch = products.slice(offset, offset + 25);
      const results = await Promise.all(batch.map(product => ingestProduct(store, product, observedAt, transitions)));
      offersChanged += results.filter(Boolean).length;
    }
  } finally {
    await remapOrphanedCanonicalReferences(transitions);
  }
  if (complete) {
    await prisma.priceProduct.updateMany({
      where: { storeId: store.id, active: true, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: observedAt } }] },
      data: { missingSyncCount: { increment: 1 } },
    });
    await prisma.priceProduct.updateMany({
      where: { storeId: store.id, active: true, missingSyncCount: { gte: 2 } },
      data: { active: false },
    });
  }
  return offersChanged;
}

async function fetchPaviPama() {
  const products = [];
  const maxPages = Math.max(0, Number(process.env.PAVIPAMA_MAX_PAGES || 0));
  let page = 0;
  let totalPages = 1;
  do {
    const url = new URL('https://pavipama.com.mt/api/cli/ecommerce/products');
    Object.entries({ store: '', q: '', p: page, category: '', onlyPromotions: false, onlyBranded: false, tag: '' })
      .forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await fetchJson(url.toString());
    if (response.responseCode !== 0 || !Array.isArray(response.data)) throw new Error('Unexpected PAVI/PAMA catalogue response');
    totalPages = Number(response.totalPages || 0);
    for (const item of response.data) {
      const guestPromotion = Array.isArray(item.promotions)
        ? item.promotions.find(promotion => (
            promotion.valueGuest !== null
            && promotion.valueGuest !== undefined
            && promotion.valueGuest !== ''
            && Number.isFinite(Number(promotion.valueGuest))
          ))
        : null;
      const publicPrice = guestPromotion ? Number(guestPromotion.valueGuest) : Number(item.price);
      const priceCents = eurosToCents(publicPrice);
      if (priceCents == null || !item.id || !item.description) continue;
      const possibleLoyaltyPrice = eurosToCents(item.netPrice);
      products.push({
        externalId: String(item.id),
        sku: item.ref ? String(item.ref) : null,
        barcode: item.barcode ? String(item.barcode) : null,
        name: String(item.description).trim(),
        brand: item.brand && item.brand !== 'NoBrand' ? String(item.brand).trim() : null,
        priceCents,
        regularPriceCents: eurosToCents(item.price) || priceCents,
        loyaltyPriceCents: possibleLoyaltyPrice != null && possibleLoyaltyPrice < priceCents ? possibleLoyaltyPrice : null,
        unitPriceCents: eurosToCents(item.pricePerUm),
        unitPriceUnit: item.umPerUm ? String(item.umPerUm).toUpperCase() : null,
        unit: item.um || null,
        packageValue: Number(item.productWeight || item.weight || 0) || null,
        packageUnit: item.productWeight || item.weight ? 'KG' : null,
        packCount: 1,
        category: item.categoryDescription || null,
        available: item.available !== false && item.enabled !== false,
        imageUrl: item.imageUrl || item.imageThumbnailUrl || item.image || null,
        sourceUrl: `https://www.pavipama.com.mt/app/product/${encodeURIComponent(item.barcode || item.id)}`,
      });
    }
    page += 1;
    if (page < totalPages && (!maxPages || page < maxPages)) await sleep(REQUEST_DELAY_MS);
  } while (page < totalPages && (!maxPages || page < maxPages));
  return { products, complete: !maxPages || page >= totalPages };
}

async function fetchGreens() {
  const landing = await fetchText('https://www.greens.com.mt/products?cat=all&loc=SM');
  const token = landing.match(/getProductList\('([^']+)'/)?.[1];
  if (!token) throw new Error('Greens catalogue token was not found');
  const products = [];
  const maxPages = Math.max(0, Number(process.env.GREENS_MAX_PAGES || 0));
  const pageSize = 250;
  let page = 1;
  let complete = false;
  do {
    const url = new URL('https://www.greens.com.mt/apiservices/retail/sync/productlist');
    const params = {
      Agent: 'GREENS', Loc: 'SM', Eid: 'N/A', SearchCriteria: '', page, NumberOfRecords: pageSize,
      SortType: 'Position', SortDirection: 'Asc', Category: 'all', Category2: '', Category3: '', Type: '',
      Cid: '00000000-0000-0000-0000-000000000000', Cart: '00000000-0000-0000-0000-000000000000',
      SubType: '', Brand: '', ProductListType: 'products', Mobdev: 'False', Detailed: 'True',
    };
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await fetchJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!Array.isArray(response.ProductList)) throw new Error('Unexpected Greens catalogue response');
    if (!response.ProductList.length) {
      complete = true;
      break;
    }
    for (const entry of response.ProductList) {
      const item = entry.ProductDetails || {};
      const priceCents = eurosToCents(item.SALES_PRICE);
      if (!item.PART_NUMBER || !item.PART_DESCRIPTION || priceCents == null) continue;
      products.push({
        externalId: String(item.PART_NUMBER),
        sku: String(item.PART_NUMBER),
        // PART_NUMBER is a retailer identifier unless it is also a valid GTIN.
        barcode: normalizeBarcode(item.PART_NUMBER),
        name: String(item.PART_DESCRIPTION).trim(),
        brand: item.GROUP_4 ? String(item.GROUP_4).trim() : null,
        priceCents,
        regularPriceCents: eurosToCents(item.SALES_PRICE_RRP) || priceCents,
        unit: item.UOM || null,
        packageValue: Number(item.SIZE_VALUE || 0) || null,
        packageUnit: item.SIZE_UOM || null,
        packCount: 1,
        category: [item.GROUP_1, item.GROUP_2, item.GROUP_3].filter(Boolean).join(' / '),
        available: item.SYSTEM_STATUS !== 'I',
        imageUrl: mayUseGreensImages()
          ? `https://www.greens.com.mt/mediaproducts/webp/${encodeURIComponent(item.PART_NUMBER)}.webp`
          : null,
        sourceUrl: `https://www.greens.com.mt/productdetails?pid=${encodeURIComponent(item.PART_NUMBER)}`,
      });
    }
    complete = !hasMoreGreensPages(response.ProductList.length, pageSize);
    page += 1;
    if (!complete && (!maxPages || page <= maxPages)) await sleep(Math.max(REQUEST_DELAY_MS, 500));
  } while (!complete && (!maxPages || page <= maxPages));
  return { products, complete };
}

function parseWelbeesProducts(html) {
  const output = [];
  const segments = String(html).split('product-main-holder"').slice(1);
  for (const raw of segments) {
    const segment = raw.slice(0, 7000);
    const externalId = segment.match(/data-product-code="([^"]+)"/)?.[1];
    const name = decodeHtml(segment.match(/<h6[^>]*>([\s\S]*?)<\/h6>/i)?.[1]);
    const selling = segment.match(/text-tertiary[^>]*>(?:&euro;|€)\s*([0-9.,]+)/i)?.[1];
    if (!externalId || !name || !selling) continue;
    const regular = segment.match(/RRP\s*(?:&euro;|€)\s*([0-9.,]+)/i)?.[1];
    const unitPrice = segment.match(/(?:&euro;|€)\s*([0-9.,]+)\/([a-z]+)/i);
    const sizeMatches = Array.from(segment.matchAll(/font-light text-grey-dark inline-block[^>]*>([\s\S]*?)<\/div>/gi));
    const unit = decodeHtml(sizeMatches.at(-1)?.[1]);
    const imageUrl = segment.match(/background-image:\s*url\('([^']+)'\)/i)?.[1] || null;
    const priceCents = eurosToCents(String(selling).replace(',', '.'));
    if (priceCents == null) continue;
    output.push({
      externalId,
      sku: externalId,
      barcode: null,
      name,
      brand: name.split(/\s+/)[0] || null,
      priceCents,
      regularPriceCents: eurosToCents(String(regular || selling).replace(',', '.')) || priceCents,
      unitPriceCents: unitPrice ? eurosToCents(String(unitPrice[1]).replace(',', '.')) : null,
      unitPriceUnit: unitPrice?.[2]?.toUpperCase() || null,
      unit: unit || null,
      category: null,
      available: true,
      imageUrl,
      sourceUrl: `https://welbees.mt/shop?s=${encodeURIComponent(externalId)}`,
    });
  }
  return output;
}

async function fetchWelbees() {
  const home = await fetchText('https://welbees.mt/');
  const categoryIds = Array.from(home.matchAll(/(?:\.\/|https:\/\/welbees\.mt\/)shop\?category=([A-Za-z0-9_-]+)/g), match => match[1]);
  const uniqueCategories = Array.from(new Set(categoryIds));
  const byId = new Map(parseWelbeesProducts(home).map(product => [product.externalId, product]));
  for (const category of uniqueCategories) {
    const html = await fetchText(`https://welbees.mt/shop?category=${encodeURIComponent(category)}`);
    for (const product of parseWelbeesProducts(html)) byId.set(product.externalId, product);
    await sleep(Math.max(REQUEST_DELAY_MS, 1000));
  }
  if (!byId.size) throw new Error('Welbee\'s catalogue contained no products');
  return { products: Array.from(byId.values()), complete: true };
}

function parseHappyShopperProducts(html) {
  const products = [];
  const segments = String(html)
    .split(/<form[^>]*class="[^"]*oe_product_cart[^"]*"[^>]*>/i)
    .slice(1);
  for (const raw of segments) {
    const segment = raw.split('</form>', 1)[0];
    const nameTag = segment.match(/<a[^>]*itemprop="name"[^>]*>[\s\S]*?<\/a>/i)?.[0];
    const href = nameTag?.match(/href="([^"]+)"/i)?.[1];
    const externalId = segment.match(/data-product-template-id="(\d+)"/i)?.[1]
      || href?.match(/-(\d+)\/?(?:\?.*)?$/)?.[1];
    const contentName = nameTag?.match(/content="([^"]+)"/i)?.[1];
    const name = decodeHtml(contentName || nameTag?.replace(/<[^>]+>/g, '')).trim();
    const price = segment.match(/<span[^>]*itemprop="price"[^>]*>([^<]+)<\/span>/i)?.[1];
    const priceCents = eurosToCents(price);
    const imageTag = segment.match(/<img[^>]*itemprop="image"[^>]*>/i)?.[0];
    const imagePath = imageTag?.match(/src="([^"]+)"/i)?.[1] || null;
    if (!externalId || !name || !href || priceCents == null) continue;
    products.push({
      externalId,
      sku: externalId,
      barcode: null,
      name,
      brand: null,
      priceCents,
      regularPriceCents: priceCents,
      unit: null,
      category: null,
      available: true,
      imageUrl: imagePath ? new URL(decodeHtml(imagePath), 'https://hs.mt').toString() : null,
      sourceUrl: new URL(decodeHtml(href), 'https://hs.mt').toString(),
    });
  }
  return products;
}

async function fetchHappyShopper() {
  const byId = new Map();
  const pageSize = 24;
  const maxPages = Math.max(0, Number(process.env.HAPPYSHOPPER_MAX_PAGES || 0));
  let page = 1;
  let pagesFetched = 0;
  let complete = false;
  do {
    const html = await fetchText(`https://hs.mt/shop?ppg=${pageSize}&page=${page}`);
    const products = parseHappyShopperProducts(html);
    if (!products.length) {
      if (page === 1) throw new Error('Happy Shopper catalogue contained no products');
      complete = true;
      break;
    }
    const previousSize = byId.size;
    for (const product of products) byId.set(product.externalId, product);
    if (page > 0 && byId.size === previousSize) {
      throw new Error(`Happy Shopper catalogue repeated page ${page}`);
    }
    complete = products.length < pageSize;
    page += 1;
    pagesFetched += 1;
    if (!complete && (!maxPages || pagesFetched < maxPages)) await sleep(Math.max(REQUEST_DELAY_MS, 1000));
  } while (!complete && (!maxPages || pagesFetched < maxPages));
  return { products: Array.from(byId.values()), complete };
}

function runSmartScraper() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/scrape-smart.js'], {
      cwd: process.cwd(),
      env: { ...process.env, DRYRUN: '' },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Smart scraper exited with code ${code}`)));
  });
}

async function adoptSmartProducts(store, observedAt, complete) {
  const previousActiveCount = await prisma.priceProduct.count({
    where: { storeId: store.id, active: true },
  });
  const products = await prisma.priceProduct.findMany({
    where: {
      storeId: store.id,
      active: true,
      OR: [
        { lastSeenAt: { gte: observedAt } },
        { canonicalProductId: null },
      ],
    },
    select: {
      id: true,
      name: true,
      brand: true,
      barcode: true,
      externalId: true,
      canonicalProductId: true,
    },
  });
  if (complete && previousActiveCount >= 100 && products.length < Math.ceil(previousActiveCount * 0.6)) {
    throw new Error(`Smart catalogue safety check rejected ${products.length} products; ${previousActiveCount} were previously active`);
  }
  const transitions = new Map();
  try {
    for (const product of products) {
      const pack = parsePackage(product.name);
      const identity = canonicalKey(product, pack, `${store.slug}:${product.externalId || product.id}`);
      const canonical = await prisma.canonicalProduct.upsert({
        where: { exactKey: identity.exactKey },
        update: { displayName: product.name, brand: product.brand || undefined },
        create: {
          exactKey: identity.exactKey,
          displayName: product.name,
          brand: product.brand,
          normalizedName: normalizeText(product.name),
          barcode: identity.barcode,
          packageValue: pack.packageValue,
          packageUnit: pack.packageUnit,
          packCount: pack.packCount,
        },
      });
      await prisma.priceProduct.update({
        where: { id: product.id },
        data: {
          canonicalProductId: canonical.id,
          packageValue: pack.packageValue,
          packageUnit: pack.packageUnit,
          packCount: pack.packCount,
          matchSource: identity.source,
          matchConfidence: identity.confidence,
        },
      });
      recordCanonicalTransition(transitions, product.canonicalProductId, canonical.id);
    }
  } finally {
    await remapOrphanedCanonicalReferences(transitions);
  }
  if (complete) {
    await prisma.priceProduct.updateMany({
      where: { storeId: store.id, active: true, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: observedAt } }] },
      data: { missingSyncCount: { increment: 1 } },
    });
    await prisma.priceProduct.updateMany({
      where: { storeId: store.id, active: true, missingSyncCount: { gte: 2 } },
      data: { active: false },
    });
  }
  return products.length;
}

async function syncOne(config) {
  const store = await ensureStore(config);
  const startedAt = new Date();
  const run = await prisma.priceSyncRun.create({ data: { storeId: store.id } });
  await prisma.store.update({
    where: { id: store.id },
    data: { lastSyncAttemptAt: startedAt, syncError: null },
  });
  try {
    let productsSeen = 0;
    let offersChanged = 0;
    if (config.slug === 'smart') {
      await runSmartScraper();
      const complete = !String(process.env.CAT || '').trim()
        && !(Number(process.env.MAX_PAGES || 0) > 0);
      productsSeen = await adoptSmartProducts(store, startedAt, complete);
    } else {
      const catalogue = config.slug === 'greens'
        ? await fetchGreens()
        : config.slug === 'welbees'
          ? await fetchWelbees()
          : config.slug === 'pavipama'
            ? await fetchPaviPama()
            : await fetchHappyShopper();
      productsSeen = catalogue.products.length;
      offersChanged = await ingestCatalogue(store, catalogue.products, startedAt, catalogue.complete);
    }
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.priceSyncRun.update({
        where: { id: run.id },
        data: { status: 'SUCCEEDED', productsSeen, offersChanged, finishedAt },
      }),
      prisma.store.update({
        where: { id: store.id },
        data: { lastSuccessfulSyncAt: finishedAt, consecutiveFailures: 0, syncError: null },
      }),
    ]);
    console.log(`${config.name}: ${productsSeen} products observed, ${offersChanged} price states changed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.priceSyncRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', error: message.slice(0, 2000), finishedAt },
      }),
      prisma.store.update({
        where: { id: store.id },
        data: { consecutiveFailures: { increment: 1 }, syncError: message.slice(0, 2000) },
      }),
    ]);
    throw error;
  }
}

async function main() {
  let failed = false;
  const requestedStores = stores.filter(store => STORE_FILTER.has(store.slug));
  const selectedStores = requestedStores.filter(store => isStorePermitted(store.slug));
  for (const store of requestedStores.filter(store => !isStorePermitted(store.slug))) {
    console.warn(`${store.name} sync skipped: set PAVIPAMA_PERMISSION_CONFIRMED=true only after obtaining written permission`);
  }
  const selectedSlugs = new Set(selectedStores.map(store => store.slug));
  const disabledSlugs = stores
    .map(store => store.slug)
    .filter(slug => !selectedSlugs.has(slug));
  if (disabledSlugs.length) {
    await prisma.store.updateMany({
      where: { slug: { in: disabledSlugs }, enabled: true },
      data: { enabled: false },
    });
  }
  for (const config of selectedStores) {
    try {
      await syncOne(config);
    } catch (error) {
      failed = true;
      console.error(`${config.name} sync failed:`, error);
    }
  }
  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  main().finally(() => prisma.$disconnect());
}

module.exports = {
  canonicalKey,
  decodeHtml,
  eurosToCents,
  fetchGreens,
  fetchHappyShopper,
  fetchPaviPama,
  fetchWelbees,
  hasMoreGreensPages,
  isStorePermitted,
  mayUseGreensImages,
  normalizeBarcode,
  normalizeText,
  parsePackage,
  parseHappyShopperProducts,
  parseWelbeesProducts,
};
