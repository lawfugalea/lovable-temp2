import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireMembershipIn } from '@/lib/api-guards'
import { parseRequiredDate } from '@/lib/medicine'

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.query.householdId || req.body?.householdId || '')
  const context = await requireMembershipIn(req, res, householdId)
  if (!context) return

  if (req.method === 'GET') {
    const childId = typeof req.query.childId === 'string' ? req.query.childId : undefined
    const episodes = await prisma.healthEpisode.findMany({
      where: { householdId, ...(childId ? { childId } : {}) },
      include: { _count: { select: { doses: true, feverReadings: true } } },
      orderBy: { startedAt: 'desc' },
    })
    return res.status(200).json(episodes)
  }

  if (req.method === 'POST') {
    const childId = typeof req.body?.childId === 'string' ? req.body.childId : ''
    const startedAt = req.body?.startedAt ? parseRequiredDate(req.body.startedAt) : new Date()
    const title = text(req.body?.title, 120)
    const notes = text(req.body?.notes, 2000)
    if (!childId || !startedAt) return res.status(400).json({ error: 'Valid child and start time are required' })
    const child = await prisma.child.findFirst({ where: { id: childId, householdId }, select: { id: true } })
    if (!child) return res.status(404).json({ error: 'Child not found' })

    const episode = await prisma.$transaction(async (tx) => {
      const open = await tx.healthEpisode.findMany({ where: { childId, endedAt: null }, select: { id: true, startedAt: true } })
      for (const existing of open) {
        const [lastDose, lastTemperature] = await Promise.all([
          tx.medicineDose.findFirst({ where: { episodeId: existing.id }, orderBy: { takenAt: 'desc' }, select: { takenAt: true } }),
          tx.feverReading.findFirst({ where: { episodeId: existing.id }, orderBy: { takenAt: 'desc' }, select: { takenAt: true } }),
        ])
        const lastEventAt = [lastDose?.takenAt, lastTemperature?.takenAt, existing.startedAt]
          .filter((date): date is Date => Boolean(date))
          .sort((left, right) => right.getTime() - left.getTime())[0]
        await tx.healthEpisode.update({
          where: { id: existing.id },
          data: { endedAt: lastEventAt > startedAt ? startedAt : lastEventAt },
        })
      }
      return tx.healthEpisode.create({
        data: { householdId, childId, startedAt, title: title || 'Illness episode', notes, createdBy: context.userId },
      })
    })
    return res.status(201).json(episode)
  }

  if (req.method === 'PATCH') {
    const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId : ''
    const action = req.body?.action
    const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId } })
    if (!episode) return res.status(404).json({ error: 'Episode not found' })
    if (action === 'continue') {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.healthEpisode.updateMany({
          where: { childId: episode.childId, endedAt: null, id: { not: episodeId } },
          data: { endedAt: new Date() },
        })
        return tx.healthEpisode.update({ where: { id: episodeId }, data: { endedAt: null } })
      })
      return res.status(200).json(updated)
    }
    if (action === 'close') {
      const endedAt = req.body?.endedAt ? parseRequiredDate(req.body.endedAt) : new Date()
      if (!endedAt || endedAt < episode.startedAt) return res.status(400).json({ error: 'Invalid episode end time' })
      const updated = await prisma.healthEpisode.update({ where: { id: episodeId }, data: { endedAt } })
      return res.status(200).json(updated)
    }
    return res.status(400).json({ error: 'Invalid episode action' })
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}
