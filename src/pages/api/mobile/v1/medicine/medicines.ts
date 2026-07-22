import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileHealthMutationResponse, MobileSaveMedicineRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { mobileHealthMember, verifiedMedicineInput } from '@/lib/mobile-health'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileHealthMutationResponse | MobileApiError>) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method || '')) { res.setHeader('Allow', ['POST', 'PUT', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileSaveMedicineRequest> & { id?: string }
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  if (!(await mobileHealthMember(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  const id = typeof body.id === 'string' ? body.id : ''
  if (req.method === 'DELETE') {
    const medicine = await prisma.medicine.findFirst({ where: { id, householdId, isTemplate: false }, select: { id: true } })
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' })
    const [doses, reminders] = await Promise.all([prisma.medicineDose.count({ where: { medicineId: id } }), prisma.medicineReminder.count({ where: { medicineId: id } })])
    if (doses || reminders) await prisma.medicine.update({ where: { id }, data: { isActive: false } })
    else await prisma.medicine.delete({ where: { id } })
    return res.status(200).json({ ok: true, id })
  }
  const existing = req.method === 'PUT' ? await prisma.medicine.findFirst({ where: { id, householdId, isTemplate: false } }) : null
  if (req.method === 'PUT' && !existing) return res.status(404).json({ error: 'Medicine not found' })
  const normalized = verifiedMedicineInput(body as Record<string, unknown>, existing || undefined)
  if ('error' in normalized) return res.status(400).json({ error: normalized.error || 'Invalid medicine details' })
  const child = await prisma.child.findFirst({ where: { id: normalized.data.childId, householdId }, select: { id: true } })
  if (!child) return res.status(400).json({ error: 'Child does not belong to this household' })
  if (normalized.data.episodeId) {
    const episode = await prisma.healthEpisode.findFirst({ where: { id: normalized.data.episodeId, householdId, childId: child.id }, select: { id: true } })
    if (!episode) return res.status(400).json({ error: 'Episode does not belong to this child' })
  }
  if (existing) {
    await prisma.medicine.update({ where: { id }, data: { ...normalized.data, scheduleVerifiedBy: identity.userId } })
    return res.status(200).json({ ok: true, id })
  }
  const created = await prisma.medicine.create({ data: { ...normalized.data, householdId, scheduleVerifiedBy: identity.userId } })
  return res.status(201).json({ ok: true, id: created.id })
}

export default withApiHandler(handler)
