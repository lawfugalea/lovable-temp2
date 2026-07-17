import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireMembershipIn } from '@/lib/api-guards'
import { parseRequiredDate } from '@/lib/medicine'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.query.householdId || req.body?.householdId || '')
  const context = await requireMembershipIn(req, res, householdId)
  if (!context) return

  if (req.method === 'GET') {
    const childId = typeof req.query.childId === 'string' ? req.query.childId : undefined
    const weights = await prisma.weightMeasurement.findMany({
      where: { child: { householdId }, ...(childId ? { childId } : {}) },
      orderBy: { measuredAt: 'desc' },
    })
    return res.status(200).json(weights)
  }

  if (req.method === 'POST') {
    const childId = typeof req.body?.childId === 'string' ? req.body.childId : ''
    const weightKg = Number(req.body?.weightKg)
    const measuredAt = req.body?.measuredAt ? parseRequiredDate(req.body.measuredAt) : new Date()
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null
    if (!childId || !Number.isFinite(weightKg) || weightKg < 0.5 || weightKg > 250 || !measuredAt || (notes?.length || 0) > 500) {
      return res.status(400).json({ error: 'Valid child, weight, and measurement time are required' })
    }
    const child = await prisma.child.findFirst({ where: { id: childId, householdId }, select: { id: true } })
    if (!child) return res.status(404).json({ error: 'Child not found' })
    const weight = await prisma.weightMeasurement.create({
      data: { childId, weightKg, measuredAt, notes, recordedBy: context.userId },
    })
    return res.status(201).json(weight)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
