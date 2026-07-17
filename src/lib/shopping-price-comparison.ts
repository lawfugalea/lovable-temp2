export const FRESH_PRICE_MS = 48 * 60 * 60 * 1000
export const MAX_VISIBLE_PRICE_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type PriceFreshness = 'FRESH' | 'STALE' | 'EXPIRED'

export interface ComparisonStore {
  id: string
  name: string
  slug: string
  lastSuccessfulSyncAt?: Date | string | null
}

export interface ComparisonOffer {
  storeId: string
  storeName: string
  storeSlug: string
  productId: string
  productName: string
  priceCents: number
  regularPriceCents?: number | null
  loyaltyPriceCents?: number | null
  unit?: string | null
  unitPriceCents?: number | null
  unitPriceUnit?: string | null
  sourceUrl: string | null
  observedAt: Date | string
  available: boolean
}

export interface ComparisonItemInput {
  id: string
  title: string
  quantityCount: number
  canonicalProductId?: string | null
  offers: ComparisonOffer[]
}

export interface PresentedOffer extends Omit<ComparisonOffer, 'observedAt'> {
  observedAt: string
  freshness: PriceFreshness
  lineTotalCents: number
  isPublicPromotion: boolean
}

export interface ComparedItem {
  id: string
  title: string
  quantityCount: number
  canonicalProductId: string | null
  matchStatus: 'UNMATCHED' | 'NO_CURRENT_OFFERS' | 'MATCHED'
  offers: PresentedOffer[]
}

export interface StoreBasket {
  storeId: string
  storeName: string
  storeSlug: string
  complete: boolean
  coverageCount: number
  itemCount: number
  totalCents: number
  missingItemIds: string[]
}

export interface MixedStoreGroup {
  storeId: string
  storeName: string
  storeSlug: string
  subtotalCents: number
  items: Array<{
    shoppingItemId: string
    title: string
    quantityCount: number
    productName: string
    priceCents: number
    lineTotalCents: number
    sourceUrl: string | null
  }>
}

export interface BasketComparison {
  generatedAt: string
  items: ComparedItem[]
  completeStores: StoreBasket[]
  incompleteStores: StoreBasket[]
  mixed: {
    complete: boolean
    coverageCount: number
    itemCount: number
    totalCents: number
    missingItemIds: string[]
    stores: MixedStoreGroup[]
  }
}

function timestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

export function priceFreshness(observedAt: Date | string, now = new Date()): PriceFreshness {
  const age = now.getTime() - timestamp(observedAt)
  if (age <= FRESH_PRICE_MS) return 'FRESH'
  if (age <= MAX_VISIBLE_PRICE_AGE_MS) return 'STALE'
  return 'EXPIRED'
}

export function buildBasketComparison(
  itemInputs: ComparisonItemInput[],
  stores: ComparisonStore[],
  now = new Date(),
): BasketComparison {
  const items: ComparedItem[] = itemInputs.map(item => {
    const offers = item.offers
      .map(offer => ({
        ...offer,
        observedAt: new Date(offer.observedAt).toISOString(),
        freshness: priceFreshness(offer.observedAt, now),
        lineTotalCents: offer.priceCents * item.quantityCount,
        isPublicPromotion: Boolean(
          offer.regularPriceCents && offer.regularPriceCents > offer.priceCents,
        ),
      }))
      .filter(offer => offer.freshness !== 'EXPIRED')
      .sort((a, b) => a.priceCents - b.priceCents)

    const hasFreshOffer = offers.some(offer => offer.available && offer.freshness === 'FRESH')
    const matchStatus = !item.canonicalProductId
      ? 'UNMATCHED'
      : hasFreshOffer
        ? 'MATCHED'
        : 'NO_CURRENT_OFFERS'

    return {
      id: item.id,
      title: item.title,
      quantityCount: item.quantityCount,
      canonicalProductId: item.canonicalProductId || null,
      matchStatus,
      offers,
    }
  })

  const storeBaskets = stores.map(store => {
    let totalCents = 0
    const missingItemIds: string[] = []

    for (const item of items) {
      const offer = item.offers
        .filter(candidate => (
          candidate.storeId === store.id
          && candidate.available
          && candidate.freshness === 'FRESH'
        ))
        .sort((a, b) => a.priceCents - b.priceCents)[0]

      if (!offer) missingItemIds.push(item.id)
      else totalCents += offer.lineTotalCents
    }

    return {
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      complete: missingItemIds.length === 0,
      coverageCount: items.length - missingItemIds.length,
      itemCount: items.length,
      totalCents,
      missingItemIds,
    }
  })

  const completeStores = storeBaskets
    .filter(store => store.complete)
    .sort((a, b) => a.totalCents - b.totalCents)
  const incompleteStores = storeBaskets
    .filter(store => !store.complete)
    .sort((a, b) => b.coverageCount - a.coverageCount || a.totalCents - b.totalCents)

  const missingItemIds: string[] = []
  const groups = new Map<string, MixedStoreGroup>()
  let mixedTotal = 0

  for (const item of items) {
    const cheapest = item.offers.find(offer => offer.available && offer.freshness === 'FRESH')
    if (!cheapest) {
      missingItemIds.push(item.id)
      continue
    }

    mixedTotal += cheapest.lineTotalCents
    const group = groups.get(cheapest.storeId) || {
      storeId: cheapest.storeId,
      storeName: cheapest.storeName,
      storeSlug: cheapest.storeSlug,
      subtotalCents: 0,
      items: [],
    }
    group.subtotalCents += cheapest.lineTotalCents
    group.items.push({
      shoppingItemId: item.id,
      title: item.title,
      quantityCount: item.quantityCount,
      productName: cheapest.productName,
      priceCents: cheapest.priceCents,
      lineTotalCents: cheapest.lineTotalCents,
      sourceUrl: cheapest.sourceUrl,
    })
    groups.set(cheapest.storeId, group)
  }

  return {
    generatedAt: now.toISOString(),
    items,
    completeStores,
    incompleteStores,
    mixed: {
      complete: missingItemIds.length === 0,
      coverageCount: items.length - missingItemIds.length,
      itemCount: items.length,
      totalCents: mixedTotal,
      missingItemIds,
      stores: Array.from(groups.values()).sort((a, b) => b.subtotalCents - a.subtotalCents),
    },
  }
}
