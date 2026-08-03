import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import {
  PANTRY_NAME_MAX,
  PANTRY_QUANTITY_MAX,
  normalizePantryName,
  serializePantryItem,
} from '@/lib/pantry'

/** The household pantry: list it, or add/replace an item by name. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const items = await prisma.pantryItem.findMany({
      where: { householdId },
      orderBy: { name: 'asc' },
      include: { updatedBy: { select: { id: true, name: true } } },
    })
    return res.status(200).json({ items: items.map(serializePantryItem) })
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length > PANTRY_NAME_MAX) {
      return res.status(400).json({ error: `Name is required (max ${PANTRY_NAME_MAX} characters)` })
    }
    const quantity = typeof body.quantity === 'string' && body.quantity.trim()
      ? body.quantity.trim().slice(0, PANTRY_QUANTITY_MAX)
      : null

    // Adding "olive oil" when "Olive Oil" exists updates it instead of
    // duplicating; the normalized name is the item's identity.
    const item = await prisma.pantryItem.upsert({
      where: { householdId_normalizedName: { householdId, normalizedName: normalizePantryName(name) } },
      create: {
        householdId,
        name,
        normalizedName: normalizePantryName(name),
        quantity,
        updatedById: userId,
      },
      update: { name, quantity, updatedById: userId },
      include: { updatedBy: { select: { id: true, name: true } } },
    })
    return res.status(201).json({ item: serializePantryItem(item) })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
