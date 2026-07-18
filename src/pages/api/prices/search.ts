import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { apiRateLimit } from '@/lib/rate-limiter'
import { normalizeCatalogText } from '@/lib/catalog-normalization'
import { priceFreshness } from '@/lib/shopping-price-comparison'
import { withBasePath } from '@/lib/base-path'
import { safeRetailerSourceUrl } from '@/lib/catalog-source-url'
import { catalogSearchTokens, rankCatalogCandidates, tokenVariants } from '@/lib/catalog-search'

const MAX_QUERY_LENGTH = 200
const MAX_CANDIDATES = 2_000
const MAX_RESULTS = 50

function browserImageUrl(value: string | null, storeSlug: string): string | null {
  if (!value) return null
  if (storeSlug === 'smart' && /^http:\/\/www\.smart\.com\.mt\//i.test(value)) {
    return withBasePath(`/api/image-proxy?url=${encodeURIComponent(value)}`)
  }
  return value
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
  const tokens = catalogSearchTokens(query)

  // normalizedName is space-normalized, so "starts with" plus "contains ' token'"
  // is an exact word-boundary match — substrings inside words ("tea" in
  // "chateau") never qualify. Each token also matches its singular/plural forms.
  const wordBoundaryClauses = (values: string[]) => ({
    OR: values.flatMap(value => [
      { normalizedName: { startsWith: value, mode: 'insensitive' as const } },
      { normalizedName: { contains: ` ${value}`, mode: 'insensitive' as const } },
      { brand: { startsWith: value, mode: 'insensitive' as const } },
      { brand: { contains: ` ${value}`, mode: 'insensitive' as const } },
    ]),
  })
  const fetchCandidates = (tokenValueSets: string[][]) => prisma.canonicalProduct.findMany({
    where: {
      products: { some: { active: true, store: { enabled: true } } },
      AND: tokenValueSets.map(wordBoundaryClauses),
    },
    select: {
      id: true,
      displayName: true,
      brand: true,
      normalizedName: true,
    },
    take: MAX_CANDIDATES,
  })

  let candidates = await fetchCandidates(tokens.map(tokenVariants))
  if (!candidates.length && tokens.some(token => token.length >= 5)) {
    // Typo fallback: widen recall to short word prefixes ("bananna" -> "ban")
    // and let the ranker's edit-distance check keep only realistic matches.
    candidates = await fetchCandidates(
      tokens.map(token => (token.length >= 5 ? [token.slice(0, 3)] : tokenVariants(token))),
    )
  }
  const rankedIds = rankCatalogCandidates(candidates, query)
    .slice(0, MAX_RESULTS * 2)
    .map(candidate => candidate.id)
  if (!rankedIds.length) {
    res.setHeader('Cache-Control', 'private, max-age=60')
    return res.status(200).json({ items: [] })
  }
  const rank = new Map(rankedIds.map((id, index) => [id, index]))

  const products = await prisma.canonicalProduct.findMany({
    where: { id: { in: rankedIds } },
    select: {
      id: true,
      displayName: true,
      brand: true,
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
  })

  const items = products
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
      const image = offers.find(offer => offer.available && offer.imageUrl)
        || offers.find(offer => offer.imageUrl)
      return {
        id: product.id,
        canonicalProductId: product.id,
        title: product.displayName,
        brand: product.brand,
        packageValue: product.packageValue?.toString() || null,
        packageUnit: product.packageUnit,
        packCount: product.packCount,
        imageUrl: image?.imageUrl || null,
        offers,
        store: best?.storeName || null,
        nowCents: best?.priceCents ?? null,
        price: best ? `${(best.priceCents / 100).toFixed(2)} EUR` : null,
        url: best?.sourceUrl || null,
        _rank: rank.get(product.id) ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .filter(product => product.offers.length > 0)
    .sort((a, b) => a._rank - b._rank || (a.nowCents || Number.MAX_SAFE_INTEGER) - (b.nowCents || Number.MAX_SAFE_INTEGER))
    .slice(0, MAX_RESULTS)
    .map(({ _rank, ...product }) => product)

  res.setHeader('Cache-Control', 'private, max-age=60')
  return res.status(200).json({ items })
}
