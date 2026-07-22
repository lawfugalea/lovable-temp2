import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileHealthMutationResponse, MobileSaveEpisodeRequest, MobileUpdateEpisodeRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { mobileHealthMember, normalizedText } from '@/lib/mobile-health'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { parseRequiredDate } from '@/lib/medicine'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileHealthMutationResponse | MobileApiError>) {
  if (req.method !== 'POST' && req.method !== 'PATCH') { res.setHeader('Allow', ['POST', 'PATCH']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as (Partial<MobileSaveEpisodeRequest> & Partial<MobileUpdateEpisodeRequest> & { id?: string })
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  if (!(await mobileHealthMember(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  if (req.method === 'POST') {
    const childId = typeof body.childId === 'string' ? body.childId : ''
    const startedAt = body.startedAt ? parseRequiredDate(body.startedAt) : new Date()
    const child = await prisma.child.findFirst({ where: { id: childId, householdId }, select: { id: true } })
    if (!child || !startedAt) return res.status(400).json({ error: 'Valid child and start time are required' })
    const episode = await prisma.$transaction(async tx => {
      await tx.healthEpisode.updateMany({ where: { childId, endedAt: null }, data: { endedAt: startedAt } })
      return tx.healthEpisode.create({ data: { householdId, childId, title: normalizedText(body.title, 120) || 'Illness episode', notes: normalizedText(body.notes, 2000), startedAt, createdBy: identity.userId } })
    })
    return res.status(201).json({ ok: true, id: episode.id })
  }
  const id = typeof body.id === 'string' ? body.id : ''
  const episode = await prisma.healthEpisode.findFirst({ where: { id, householdId }, select: { id: true, childId: true, startedAt: true } })
  if (!episode) return res.status(404).json({ error: 'Episode not found' })
  if (body.action === 'close') {
    const endedAt = body.endedAt ? parseRequiredDate(body.endedAt) : new Date()
    if (!endedAt || endedAt < episode.startedAt) return res.status(400).json({ error: 'Invalid episode end time' })
    await prisma.healthEpisode.update({ where: { id }, data: { endedAt } })
  } else if (body.action === 'continue') {
    await prisma.$transaction([prisma.healthEpisode.updateMany({ where: { childId: episode.childId, endedAt: null, id: { not: id } }, data: { endedAt: new Date() } }), prisma.healthEpisode.update({ where: { id }, data: { endedAt: null } })])
  } else return res.status(400).json({ error: 'Choose close or continue' })
  return res.status(200).json({ ok: true, id })
}

export default withApiHandler(handler)
