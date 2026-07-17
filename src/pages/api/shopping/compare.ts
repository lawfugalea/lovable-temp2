import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { apiRateLimit } from '@/lib/rate-limiter'
import { buildBasketComparison, type ComparisonItemInput } from '@/lib/shopping-price-comparison'
import { safeRetailerSourceUrl } from '@/lib/catalog-source-url'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (!(await apiRateLimit(req, res))) return

  const listId = typeof req.query.listId === 'string' ? req.query.listId.trim() : ''
  if (!listId || listId.length > 100) return res.status(400).json({ error: 'Invalid listId' })

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { householdId: true },
  })
  if (!list) return res.status(404).json({ error: 'Shopping list not found' })

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId: list.householdId },
    select: { id: true },
  })
  if (!membership) return res.status(403).json({ error: 'Forbidden' })

  const items = await prisma.shoppingItem.findMany({
    where: { listId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      quantityCount: true,
      canonicalProductId: true,
      canonicalProduct: {
        select: {
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
      },
    },
  })

  const stores = await prisma.store.findMany({
    where: { enabled: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, lastSuccessfulSyncAt: true },
  })

  const comparisonItems: ComparisonItemInput[] = items.map(item => ({
    id: item.id,
    title: item.title,
    quantityCount: item.quantityCount,
    canonicalProductId: item.canonicalProductId,
    offers: (item.canonicalProduct?.products || []).flatMap(product => {
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
    }),
  }))

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json(buildBasketComparison(comparisonItems, stores))
}
