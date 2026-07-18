import { prisma } from './prisma'
import { safeRetailerSourceUrl } from './catalog-source-url'
import type { ComparisonOffer, ComparisonStore } from './shopping-price-comparison'

/** Enabled stores in the shape buildBasketComparison expects. */
export function loadEnabledComparisonStores(): Promise<ComparisonStore[]> {
  return prisma.store.findMany({
    where: { enabled: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, lastSuccessfulSyncAt: true },
  })
}

/**
 * Latest offer per active store product for each canonical product, keyed by
 * canonical product id. Mirrors the shopping comparison exactly: one newest
 * offer per store product, retailer source URLs sanitized.
 */
export async function loadOffersByCanonicalProduct(
  canonicalProductIds: string[],
): Promise<Map<string, ComparisonOffer[]>> {
  const ids = Array.from(new Set(canonicalProductIds.filter(Boolean)))
  const map = new Map<string, ComparisonOffer[]>()
  if (!ids.length) return map

  const canonicalProducts = await prisma.canonicalProduct.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      products: {
        where: { active: true, store: { enabled: true } },
        select: {
          id: true,
          name: true,
          sourceUrl: true,
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

  for (const canonical of canonicalProducts) {
    const offers: ComparisonOffer[] = canonical.products.flatMap(product => {
      const offer = product.offers[0]
      if (!offer) return []
      return [{
        storeId: product.store.id,
        storeName: product.store.name,
        storeSlug: product.store.slug,
        productId: product.id,
        productName: product.name,
        priceCents: offer.priceCents,
        regularPriceCents: offer.regularPriceCents,
        loyaltyPriceCents: offer.loyaltyPriceCents,
        unit: offer.unit,
        unitPriceCents: offer.unitPriceCents,
        unitPriceUnit: offer.unitPriceUnit,
        sourceUrl: safeRetailerSourceUrl(product.sourceUrl, product.store.slug),
        observedAt: product.lastSeenAt || offer.scrapedAt,
        available: offer.available,
      }]
    })
    map.set(canonical.id, offers)
  }
  return map
}
