import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserIdOr401 } from '@/lib/api-guards'
import { apiRateLimit } from '@/lib/rate-limiter'
import { requireActiveHousehold } from '@/lib/chores'
import { buildBasketComparison, type ComparisonItemInput } from '@/lib/shopping-price-comparison'
import { loadEnabledComparisonStores, loadOffersByCanonicalProduct } from '@/lib/shopping-offers'
import { toComparisonInputs } from '@/lib/meal-planning'
import { aggregatePlannedIngredients, parsePlanRange } from '@/lib/meals'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { respondUpgradeRequired } from '@/lib/entitlements-core'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (!(await apiRateLimit(req, res))) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  const entitlements = await getHouseholdEntitlements(householdId)
  if (!entitlements.canUsePriceComparison) return respondUpgradeRequired(res, 'priceComparison')

  const range = parsePlanRange(req.query.from, req.query.to)
  if (!range) return res.status(400).json({ error: 'A valid from/to range (max one month) is required' })

  const { aggregated, plannedRecipeCount } = await aggregatePlannedIngredients(householdId, range.from, range.to)
  const [stores, offersByCanonical] = await Promise.all([
    loadEnabledComparisonStores(),
    loadOffersByCanonicalProduct(aggregated.map(item => item.canonicalProductId || '')),
  ])
  const inputs: ComparisonItemInput[] = toComparisonInputs(aggregated).map(input => ({
    ...input,
    offers: input.canonicalProductId ? offersByCanonical.get(input.canonicalProductId) || [] : [],
  }))

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ plannedRecipeCount, comparison: buildBasketComparison(inputs, stores) })
}
