import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { apiRateLimit } from '@/lib/rate-limiter'
import { buildBasketComparison, type ComparisonItemInput } from '@/lib/shopping-price-comparison'
import { loadEnabledComparisonStores, loadOffersByCanonicalProduct } from '@/lib/shopping-offers'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { requirePriceComparison } from '@/lib/entitlements-core'

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

  const entitlements = await getHouseholdEntitlements(list.householdId)
  if (!requirePriceComparison(res, entitlements)) return

  const items = await prisma.shoppingItem.findMany({
    where: { listId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      quantityCount: true,
      canonicalProductId: true,
    },
  })

  const [stores, offersByCanonical] = await Promise.all([
    loadEnabledComparisonStores(),
    loadOffersByCanonicalProduct(items.map(item => item.canonicalProductId || '')),
  ])

  const comparisonItems: ComparisonItemInput[] = items.map(item => ({
    id: item.id,
    title: item.title,
    quantityCount: item.quantityCount,
    canonicalProductId: item.canonicalProductId,
    offers: item.canonicalProductId ? offersByCanonical.get(item.canonicalProductId) || [] : [],
  }))

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json(buildBasketComparison(comparisonItems, stores))
}
