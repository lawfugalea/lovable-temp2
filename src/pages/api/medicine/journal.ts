import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireMembershipIn } from '@/lib/api-guards'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : ''
  const context = await requireMembershipIn(req, res, householdId)
  if (!context) return
  const requestedChildId = typeof req.query.childId === 'string' ? req.query.childId : undefined
  if (requestedChildId) {
    const child = await prisma.child.findFirst({ where: { id: requestedChildId, householdId }, select: { id: true } })
    if (!child) return res.status(404).json({ error: 'Child not found' })
  }

  const [children, episodes, medicines, doses, temperatures, weights] = await Promise.all([
    prisma.child.findMany({ where: { householdId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.healthEpisode.findMany({
      where: { householdId, ...(requestedChildId ? { childId: requestedChildId } : {}) },
      include: { _count: { select: { doses: true, feverReadings: true } } },
      orderBy: { startedAt: 'desc' }, take: 100,
    }),
    prisma.medicine.findMany({
      where: { householdId, isTemplate: false, ...(requestedChildId ? { childId: requestedChildId } : {}) },
      include: { child: true }, orderBy: { createdAt: 'desc' },
    }),
    prisma.medicineDose.findMany({
      where: { child: { householdId }, ...(requestedChildId ? { childId: requestedChildId } : {}) },
      include: { child: true, medicine: true, episode: true }, orderBy: { takenAt: 'desc' }, take: 500,
    }),
    prisma.feverReading.findMany({
      where: { child: { householdId }, ...(requestedChildId ? { childId: requestedChildId } : {}) },
      include: { child: true, episode: true }, orderBy: { takenAt: 'desc' }, take: 500,
    }),
    prisma.weightMeasurement.findMany({
      where: { child: { householdId }, ...(requestedChildId ? { childId: requestedChildId } : {}) },
      orderBy: { measuredAt: 'desc' }, take: 100,
    }),
  ])

  const recorderIds = [...new Set([
    ...doses.map((dose) => dose.takenBy),
    ...temperatures.map((reading) => reading.takenBy),
  ].filter((id): id is string => Boolean(id)))]
  const recorders = recorderIds.length
    ? await prisma.user.findMany({ where: { id: { in: recorderIds } }, select: { id: true, name: true, email: true } })
    : []
  const recorderById = new Map(recorders.map((user) => [user.id, user.name || user.email]))
  const events = [
    ...doses.map((dose) => ({ type: 'dose' as const, at: dose.takenAt, data: dose, recordedBy: dose.takenBy ? recorderById.get(dose.takenBy) || null : null })),
    ...temperatures.map((reading) => ({ type: 'temperature' as const, at: reading.takenAt, data: reading, recordedBy: reading.takenBy ? recorderById.get(reading.takenBy) || null : null })),
  ].sort((left, right) => right.at.getTime() - left.at.getTime())

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ children, episodes, medicines, doses, temperatures, weights, events })
}
