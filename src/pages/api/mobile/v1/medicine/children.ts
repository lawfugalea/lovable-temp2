import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileHealthMutationResponse, MobileSaveChildRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { mobileHealthMember, normalizedText } from '@/lib/mobile-health'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileHealthMutationResponse | MobileApiError>) {
  if (req.method !== 'POST' && req.method !== 'PATCH') { res.setHeader('Allow', ['POST', 'PATCH']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileSaveChildRequest> & { id?: string }
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  if (!(await mobileHealthMember(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const dateOfBirth = typeof body.dateOfBirth === 'string' ? new Date(body.dateOfBirth) : null
  const notes = normalizedText(body.notes, 2000)
  if (!name || name.length > 80 || !dateOfBirth || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) return res.status(400).json({ error: 'Valid name and date of birth are required' })
  if (req.method === 'POST') {
    const [entitlements, count] = await Promise.all([getHouseholdEntitlements(householdId), prisma.child.count({ where: { householdId } })])
    if (count >= entitlements.maxChildren) return res.status(402).json({ error: 'Your current plan has reached its child limit', code: 'UPGRADE_REQUIRED' })
    const child = await prisma.child.create({ data: { householdId, name, dateOfBirth, notes } })
    return res.status(201).json({ ok: true, id: child.id })
  }
  const id = typeof body.id === 'string' ? body.id : ''
  const existing = await prisma.child.findFirst({ where: { id, householdId }, select: { id: true } })
  if (!existing) return res.status(404).json({ error: 'Child not found' })
  await prisma.child.update({ where: { id }, data: { name, dateOfBirth, notes, ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}) } })
  return res.status(200).json({ ok: true, id })
}

export default withApiHandler(handler)
