import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { apiRateLimit } from '@/lib/rate-limiter'
import { normalizeCatalogText } from '@/lib/catalog-normalization'
import { priceFreshness } from '@/lib/shopping-price-comparison'
import { withBasePath } from '@/lib/base-path'
import { safeRetailerSourceUrl } from '@/lib/catalog-source-url'

const MAX_QUERY_LENGTH = 200

function browserImageUrl(value: string | null, storeSlug: string): string | null {
  if (!value) return null
  if (storeSlug === 'smart' && /^http:\/\/www\.smart\.com\.mt\//i.test(value)) {
    return withBasePath(`/api/image-proxy?url=${encodeURIComponent(value)}`)
  }
  return value
}

function scoreProduct(name: string, brand: string | null, tokens: string[], query: string): number {
  const haystack = normalizeCatalogText(`${brand || ''} ${name}`)
  let score = haystack === query ? 100 : haystack.startsWith(query) ? 40 : haystack.includes(query) ? 20 : 0
  for (const token of tokens) {
    if (haystack.split(' ').includes(token)) score += 8
    else if (haystack.includes(token)) score += 3
  }
  return score
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (!(await apiRateLimit(req, res))) return

  const qRaw = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (qRaw.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` })
  }
  const query = normalizeCatalogText(qRaw)
  if (query.length < 2) return res.status(200).json({ items: [] })
  const tokens = Array.from(new Set(query.split(' ').filter(token => token.length > 1))).slice(0, 8)

  const candidates = await prisma.canonicalProduct.findMany({
    where: {
      products: { some: { active: true, store: { enabled: true } } },
      OR: tokens.flatMap(token => [
        { normalizedName: { contains: token, mode: 'insensitive' as const } },
        { brand: { contains: token, mode: 'insensitive' as const } },
      ]),
    },
    select: {
      id: true,
      displayName: true,
      brand: true,
      normalizedName: true,
      packageValue: true,
      packageUnit: true,
      packCount: true,
      products: {
        where: { active: true, store: { enabled: true } },
        select: {
          id: true,
          name: true,
          sourceUrl: true,
          imageUrl: true,
          lastSeenAt: true,
          store: { select: { id: true, name: true, slug: true } },
          offers: {
            orderBy: { scrapedAt: 'desc' },
            take: 1,
            select: {
              priceCents: true,
              regularPriceCents: true,
              loyaltyPriceCents: true,
              available: true,
              unit: true,
              unitPriceCents: true,
              unitPriceUnit: true,
              scrapedAt: true,
            },
          },
        },
      },
    },
    take: 200,
  })

  const items = candidates
    .map(product => {
      const offers = product.products.flatMap(storeProduct => {
        const offer = storeProduct.offers[0]
        if (!offer) return []
        const observedAt = storeProduct.lastSeenAt || offer.scrapedAt
        const freshness = priceFreshness(observedAt)
        if (freshness === 'EXPIRED') return []
        return [{
          storeId: storeProduct.store.id,
          storeName: storeProduct.store.name,
          storeSlug: storeProduct.store.slug,
          productId: storeProduct.id,
          productName: storeProduct.name,
          priceCents: offer.priceCents,
          regularPriceCents: offer.regularPriceCents,
          loyaltyPriceCents: offer.loyaltyPriceCents,
          unit: offer.unit,
          unitPriceCents: offer.unitPriceCents,
          unitPriceUnit: offer.unitPriceUnit,
          sourceUrl: safeRetailerSourceUrl(storeProduct.sourceUrl, storeProduct.store.slug),
          imageUrl: browserImageUrl(storeProduct.imageUrl, storeProduct.store.slug),
          observedAt: observedAt.toISOString(),
          freshness,
          available: offer.available,
        }]
      }).sort((a, b) => a.priceCents - b.priceCents)
      const best = offers.find(offer => offer.available && offer.freshness === 'FRESH')
      const representative = best || offers.find(offer => offer.available) || offers[0]
      return {
        id: product.id,
        canonicalProductId: product.id,
        title: product.displayName,
        brand: product.brand,
        packageValue: product.packageValue?.toString() || null,
        packageUnit: product.packageUnit,
        packCount: product.packCount,
        imageUrl: representative?.imageUrl || null,
        offers,
        store: best?.storeName || null,
        nowCents: best?.priceCents ?? null,
        price: best ? `${(best.priceCents / 100).toFixed(2)} EUR` : null,
        url: best?.sourceUrl || null,
        _score: scoreProduct(product.displayName, product.brand, tokens, query),
      }
    })
    .filter(product => product.offers.length > 0)
    .sort((a, b) => b._score - a._score || (a.nowCents || Number.MAX_SAFE_INTEGER) - (b.nowCents || Number.MAX_SAFE_INTEGER))
    .slice(0, 50)
    .map(({ _score, ...product }) => product)

  res.setHeader('Cache-Control', 'private, max-age=60')
  return res.status(200).json({ items })
}
