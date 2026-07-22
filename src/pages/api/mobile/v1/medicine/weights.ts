import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileHealthMutationResponse, MobileSaveWeightRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { mobileHealthMember, normalizedText } from '@/lib/mobile-health'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { parseRequiredDate } from '@/lib/medicine'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileHealthMutationResponse | MobileApiError>) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method || '')) { res.setHeader('Allow', ['POST', 'PUT', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileSaveWeightRequest> & { id?: string }
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  if (!(await mobileHealthMember(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  const id = typeof body.id === 'string' ? body.id : ''
  if (req.method === 'DELETE') {
    const existing = await prisma.weightMeasurement.findFirst({ where: { id, child: { householdId } }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Weight not found' })
    await prisma.weightMeasurement.delete({ where: { id } }); return res.status(200).json({ ok: true, id })
  }
  const childId = typeof body.childId === 'string' ? body.childId : ''
  const weightKg = Number(body.weightKg)
  const measuredAt = body.measuredAt ? parseRequiredDate(body.measuredAt) : new Date()
  const child = await prisma.child.findFirst({ where: { id: childId, householdId }, select: { id: true } })
  if (!child || !Number.isFinite(weightKg) || weightKg < 0.5 || weightKg > 250 || !measuredAt) return res.status(400).json({ error: 'Valid child, weight, and time are required' })
  if (req.method === 'PUT') {
    const existing = await prisma.weightMeasurement.findFirst({ where: { id, child: { householdId } }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Weight not found' })
    await prisma.weightMeasurement.update({ where: { id }, data: { childId, weightKg, measuredAt, notes: normalizedText(body.notes, 500), recordedBy: identity.userId } })
    return res.status(200).json({ ok: true, id })
  }
  const created = await prisma.weightMeasurement.create({ data: { childId, weightKg, measuredAt, notes: normalizedText(body.notes, 500), recordedBy: identity.userId } })
  return res.status(201).json({ ok: true, id: created.id })
}

export default withApiHandler(handler)
