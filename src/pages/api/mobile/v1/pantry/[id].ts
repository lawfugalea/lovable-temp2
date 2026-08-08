import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { PANTRY_NAME_MAX, PANTRY_QUANTITY_MAX, normalizePantryName, serializePantryItem } from '@/lib/pantry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) {
    return res.status(403).json({ error: 'Household not available' })
  }
  res.setHeader('Cache-Control', 'no-store')

  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const item = await prisma.pantryItem.findFirst({ where: { id, householdId } })
  if (!item) return res.status(404).json({ error: 'Pantry item not found' })

  if (req.method === 'DELETE') {
    await prisma.pantryItem.delete({ where: { id: item.id } })
    return res.status(200).json({ ok: true })
  }

  const body = (req.body || {}) as Record<string, unknown>
  const data: { name?: string; normalizedName?: string; quantity?: string | null; updatedById: string } = {
    updatedById: identity.userId,
  }

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length > PANTRY_NAME_MAX) {
      return res.status(400).json({ error: `Name is required (max ${PANTRY_NAME_MAX} characters)` })
    }
    const normalizedName = normalizePantryName(name)
    // Renaming onto another item's identity would violate the household
    // uniqueness constraint; refuse rather than surface a database error.
    const clash = await prisma.pantryItem.findFirst({
      where: { householdId, normalizedName, id: { not: item.id } },
      select: { id: true },
    })
    if (clash) return res.status(409).json({ error: 'Another pantry item already has this name' })
    data.name = name
    data.normalizedName = normalizedName
  }

  if (body.quantity !== undefined) {
    data.quantity = typeof body.quantity === 'string' && body.quantity.trim()
      ? body.quantity.trim().slice(0, PANTRY_QUANTITY_MAX)
      : null
  }

  const updated = await prisma.pantryItem.update({
    where: { id: item.id },
    data,
    include: { updatedBy: { select: { id: true, name: true } } },
  })
  return res.status(200).json({ item: serializePantryItem(updated) })
}

export default withApiHandler(handler)
