import type { NextApiRequest, NextApiResponse } from 'next'
import type { Prisma } from '@prisma/client'
import { withApiHandler } from '@/lib/api-handler'
import { getUserIdOr401 } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { normalizeShoppingCategoryOrder } from '@/lib/shopping-categories'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const listId = typeof (req.method === 'GET' ? req.query.listId : req.body?.listId) === 'string'
    ? String(req.method === 'GET' ? req.query.listId : req.body.listId)
    : ''
  const list = listId ? await prisma.shoppingList.findUnique({ where: { id: listId }, select: { householdId: true } }) : null
  if (!list) return res.status(404).json({ error: 'Shopping list not found' })
  const membership = await prisma.membership.findUnique({ where: { userId_householdId: { userId, householdId: list.householdId } }, select: { id: true } })
  if (!membership) return res.status(403).json({ error: 'Forbidden' })
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const household = await prisma.household.findUnique({ where: { id: list.householdId }, select: { shoppingCategoryOrder: true } })
    return res.status(200).json({ order: normalizeShoppingCategoryOrder(household?.shoppingCategoryOrder) })
  }
  if (req.method === 'PATCH') {
    if (!Array.isArray(req.body?.order)) return res.status(400).json({ error: 'A category order is required' })
    const order = normalizeShoppingCategoryOrder(req.body.order)
    await prisma.household.update({ where: { id: list.householdId }, data: { shoppingCategoryOrder: order as Prisma.InputJsonValue } })
    return res.status(200).json({ order })
  }
  res.setHeader('Allow', ['GET', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
