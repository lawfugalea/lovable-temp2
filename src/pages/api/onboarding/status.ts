import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return

  const [memberCount, inviteCount, itemCount, matchedCount, mealCount, choreCount] = await Promise.all([
    prisma.membership.count({ where: { householdId } }),
    prisma.invite.count({ where: { householdId } }),
    prisma.shoppingItem.count({ where: { list: { householdId } } }),
    prisma.shoppingItem.count({ where: { list: { householdId }, canonicalProductId: { not: null } } }),
    prisma.mealPlanEntry.count({ where: { householdId } }),
    prisma.chore.count({ where: { householdId } }),
  ])

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    householdId,
    steps: {
      invitedMember: memberCount > 1 || inviteCount > 0,
      addedShoppingItem: itemCount > 0,
      matchedProduct: matchedCount > 0,
      plannedMeal: mealCount > 0,
      createdChore: choreCount > 0,
    },
  })
}
