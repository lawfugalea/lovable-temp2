import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { dateOnlyToDb, validateRecurrenceInput } from '@/lib/chore-recurrence'
import { CHORE_NOTES_MAX, CHORE_TITLE_MAX, requireActiveHousehold, serializeChore } from '@/lib/chores'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const chores = await prisma.chore.findMany({
      where: { householdId },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: [{ active: 'desc' }, { title: 'asc' }],
    })
    return res.status(200).json({ chores: chores.map(serializeChore) })
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as Record<string, unknown>
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > CHORE_TITLE_MAX) {
      return res.status(400).json({ error: `Title is required (max ${CHORE_TITLE_MAX} characters)` })
    }
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, CHORE_NOTES_MAX) : ''
    const validated = validateRecurrenceInput(body)
    if (!validated.ok) return res.status(400).json({ error: validated.error })

    let assigneeId: string | null = null
    if (typeof body.assigneeId === 'string' && body.assigneeId) {
      const member = await prisma.membership.findUnique({
        where: { userId_householdId: { userId: body.assigneeId, householdId } },
        select: { id: true },
      })
      if (!member) return res.status(400).json({ error: 'Assignee must be a member of this household' })
      assigneeId = body.assigneeId
    }

    const recurrence = validated.recurrence
    const chore = await prisma.chore.create({
      data: {
        householdId,
        title,
        notes: notes || null,
        assigneeId,
        recurrenceType: recurrence.type,
        daysOfWeek: recurrence.type === 'WEEKLY' ? recurrence.daysOfWeek : [],
        intervalDays: recurrence.type === 'EVERY_N_DAYS' ? recurrence.intervalDays : null,
        anchorDate: recurrence.type === 'EVERY_N_DAYS' ? dateOnlyToDb(recurrence.anchorDate) : null,
        dayOfMonth: recurrence.type === 'MONTHLY' ? recurrence.dayOfMonth : null,
      },
      include: { assignee: { select: { id: true, name: true } } },
    })
    return res.status(201).json({ chore: serializeChore(chore) })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
