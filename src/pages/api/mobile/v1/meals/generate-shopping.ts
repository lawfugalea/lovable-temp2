import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileGenerateMealShoppingRequest, MobileGenerateMealShoppingResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { mergeIntoExistingItems } from '@/lib/meal-planning'
import { aggregatePlannedIngredients, parsePlanRange } from '@/lib/meals'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileGenerateMealShoppingResponse | MobileApiError>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const body = (req.body || {}) as Partial<MobileGenerateMealShoppingRequest>
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  const range = parsePlanRange(body.from, body.to)
  const listId = typeof body.listId === 'string' ? body.listId : ''
  if (!householdId || !range || !listId) return res.status(400).json({ error: 'A household, valid date range, and shopping list are required' })
  if (!(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Forbidden: not a member' })
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, householdId, archivedAt: null }, select: { id: true, name: true } })
  if (!list) return res.status(400).json({ error: 'Choose an active shopping list in this household' })
  const { aggregated, plannedRecipeCount } = await aggregatePlannedIngredients(householdId, range.from, range.to)
  if (!aggregated.length) return res.status(400).json({ error: 'No recipes with ingredients are planned in this range' })
  const existing = await prisma.shoppingItem.findMany({
    where: { listId, status: 'ACTIVE' },
    select: { id: true, title: true, quantityCount: true, canonicalProductId: true },
  })
  const merge = mergeIntoExistingItems(aggregated, existing)
  await prisma.$transaction(async tx => {
    for (const increment of merge.increments) {
      await tx.shoppingItem.update({ where: { id: increment.itemId }, data: { quantityCount: { increment: increment.addCount } } })
    }
    if (merge.creates.length) await tx.shoppingItem.createMany({
      data: merge.creates.map(item => ({ ...item, listId, createdById: identity.userId })),
    })
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ listId, listName: list.name, plannedRecipeCount, created: merge.creates.length, merged: merge.increments.length })
}

export default withApiHandler(handler)
