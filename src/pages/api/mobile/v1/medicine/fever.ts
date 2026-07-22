import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileHealthMutationResponse, MobileSaveFeverRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { mobileHealthMember, normalizedText } from '@/lib/mobile-health'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { parseRequiredDate } from '@/lib/medicine'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileHealthMutationResponse | MobileApiError>) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method || '')) { res.setHeader('Allow', ['POST', 'PUT', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileSaveFeverRequest> & { id?: string }
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  if (!(await mobileHealthMember(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  const id = typeof body.id === 'string' ? body.id : ''
  if (req.method === 'DELETE') {
    const reading = await prisma.feverReading.findFirst({ where: { id, child: { householdId } }, select: { id: true } })
    if (!reading) return res.status(404).json({ error: 'Temperature not found' })
    await prisma.feverReading.delete({ where: { id } }); return res.status(200).json({ ok: true, id })
  }
  const childId = typeof body.childId === 'string' ? body.childId : ''
  const episodeId = typeof body.episodeId === 'string' ? body.episodeId : ''
  const temperature = Number(body.temperature)
  const validUnit = body.unit === 'F' || body.unit === 'C'
  const unit: 'C' | 'F' = body.unit === 'F' ? 'F' : 'C'
  const method = body.method || 'forehead'
  const takenAt = body.takenAt ? parseRequiredDate(body.takenAt) : new Date()
  const validMethod = method === 'oral' || method === 'rectal' || method === 'axillary' || method === 'ear' || method === 'forehead'
  const validRange = validUnit && (unit === 'F' ? temperature >= 86 && temperature <= 113 : temperature >= 30 && temperature <= 45)
  const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId }, select: { id: true } })
  if (!episode || !takenAt || !validRange || !validMethod) return res.status(400).json({ error: 'Valid episode, temperature, unit, method, and time are required' })
  if (req.method === 'PUT') {
    const existing = await prisma.feverReading.findFirst({ where: { id, child: { householdId } }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Temperature not found' })
    await prisma.feverReading.update({ where: { id }, data: { childId, episodeId, temperature, unit, method, takenAt, notes: normalizedText(body.notes, 2000), takenBy: identity.userId } })
    return res.status(200).json({ ok: true, id })
  }
  const created = await prisma.feverReading.create({ data: { childId, episodeId, temperature, unit, method, takenAt, notes: normalizedText(body.notes, 2000), takenBy: identity.userId } })
  return res.status(201).json({ ok: true, id: created.id })
}

export default withApiHandler(handler)
