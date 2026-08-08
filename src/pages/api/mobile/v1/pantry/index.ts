import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { PANTRY_NAME_MAX, PANTRY_QUANTITY_MAX, normalizePantryName, serializePantryItem } from '@/lib/pantry'

/**
 * The household pantry on the phone. A deliberate mirror of /api/pantry: the
 * same limits, the same serialization, and the same upsert-by-normalized-name,
 * so adding "olive oil" when "Olive Oil" exists updates it rather than creating
 * a near-duplicate the household then has to reconcile.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return

  const householdId = req.method === 'GET'
    ? (typeof req.query.householdId === 'string' ? req.query.householdId : '')
    : (typeof req.body?.householdId === 'string' ? req.body.householdId : '')
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) {
    return res.status(403).json({ error: 'Household not available' })
  }
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const items = await prisma.pantryItem.findMany({
      where: { householdId },
      orderBy: { name: 'asc' },
      include: { updatedBy: { select: { id: true, name: true } } },
    })
    return res.status(200).json({ householdId, items: items.map(serializePantryItem) })
  }

  const body = (req.body || {}) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (!name || name.length > PANTRY_NAME_MAX) {
    return res.status(400).json({ error: `Name is required (max ${PANTRY_NAME_MAX} characters)` })
  }
  const quantity = typeof body.quantity === 'string' && body.quantity.trim()
    ? body.quantity.trim().slice(0, PANTRY_QUANTITY_MAX)
    : null

  const item = await prisma.pantryItem.upsert({
    where: { householdId_normalizedName: { householdId, normalizedName: normalizePantryName(name) } },
    create: { householdId, name, normalizedName: normalizePantryName(name), quantity, updatedById: identity.userId },
    update: { name, quantity, updatedById: identity.userId },
    include: { updatedBy: { select: { id: true, name: true } } },
  })
  return res.status(201).json({ item: serializePantryItem(item) })
}

export default withApiHandler(handler)
