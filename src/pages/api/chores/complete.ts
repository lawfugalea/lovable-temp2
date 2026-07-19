import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { choreRecurrenceFromRow, dateOnlyToDb, isDateOnly, isDueOn } from '@/lib/chore-recurrence'
import { requireActiveHousehold } from '@/lib/chores'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'no-store')

  const body = (req.body || {}) as Record<string, unknown>
  const choreId = typeof body.choreId === 'string' ? body.choreId : ''
  const dueDate = typeof body.dueDate === 'string' ? body.dueDate : ''
  if (!choreId || !isDateOnly(dueDate)) {
    return res.status(400).json({ error: 'choreId and a valid dueDate are required' })
  }

  const chore = await prisma.chore.findFirst({ where: { id: choreId, householdId } })
  if (!chore) return res.status(404).json({ error: 'Chore not found' })

  if (req.method === 'DELETE') {
    await prisma.choreCompletion.deleteMany({ where: { choreId, dueDate: dateOnlyToDb(dueDate) } })
    return res.status(200).json({ ok: true })
  }

  // Only real scheduled occurrences can be resolved — keeps the log honest.
  const recurrence = choreRecurrenceFromRow(chore)
  if (!isDueOn(recurrence, dueDate)) {
    return res.status(400).json({ error: 'This chore is not scheduled on that date' })
  }

  const status = body.status === 'SKIPPED' ? 'SKIPPED' : 'DONE'
  const completion = await prisma.choreCompletion.upsert({
    where: { choreId_dueDate: { choreId, dueDate: dateOnlyToDb(dueDate) } },
    create: { choreId, dueDate: dateOnlyToDb(dueDate), status, completedById: userId },
    update: { status, completedById: userId, completedAt: new Date() },
    include: { completedBy: { select: { id: true, name: true } } },
  })
  return res.status(200).json({
    completion: {
      choreId: completion.choreId,
      dueDate,
      status: completion.status,
      completedBy: completion.completedBy,
    },
  })
}

export default withApiHandler(handler)
