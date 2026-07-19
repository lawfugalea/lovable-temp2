import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import { mergeIntoExistingItems } from '@/lib/meal-planning'
import { aggregatePlannedIngredients, parsePlanRange } from '@/lib/meals'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'no-store')

  const body = (req.body || {}) as Record<string, unknown>
  const range = parsePlanRange(body.from, body.to)
  if (!range) return res.status(400).json({ error: 'A valid from/to range (max one month) is required' })
  const listId = typeof body.listId === 'string' ? body.listId : ''
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId, archivedAt: null },
    select: { id: true, name: true },
  })
  if (!list) return res.status(400).json({ error: 'Choose an active shopping list in this household' })

  const { aggregated, plannedRecipeCount } = await aggregatePlannedIngredients(householdId, range.from, range.to)
  if (!aggregated.length) {
    return res.status(400).json({ error: 'No recipes with ingredients are planned in this range' })
  }

  const existing = await prisma.shoppingItem.findMany({
    where: { listId: list.id, status: 'ACTIVE' },
    select: { id: true, title: true, quantityCount: true, canonicalProductId: true },
  })
  const merge = mergeIntoExistingItems(aggregated, existing)

  await prisma.$transaction(async tx => {
    for (const increment of merge.increments) {
      await tx.shoppingItem.update({
        where: { id: increment.itemId },
        data: { quantityCount: { increment: increment.addCount } },
      })
    }
    if (merge.creates.length) {
      await tx.shoppingItem.createMany({
        data: merge.creates.map(item => ({
          listId: list.id,
          title: item.title,
          quantityCount: item.quantityCount,
          canonicalProductId: item.canonicalProductId,
          createdById: userId,
        })),
      })
    }
  })

  return res.status(200).json({
    listId: list.id,
    listName: list.name,
    plannedRecipeCount,
    created: merge.creates.length,
    merged: merge.increments.length,
  })
}

export default withApiHandler(handler)
