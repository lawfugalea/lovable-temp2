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

  const choreId = typeof req.query.id === 'string' ? req.query.id : ''
  const existing = await prisma.chore.findFirst({ where: { id: choreId, householdId }, select: { id: true } })
  if (!existing) return res.status(404).json({ error: 'Chore not found' })

  if (req.method === 'DELETE') {
    await prisma.chore.delete({ where: { id: existing.id } })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const body = (req.body || {}) as Record<string, unknown>
    const data: Record<string, unknown> = {}

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title || title.length > CHORE_TITLE_MAX) {
        return res.status(400).json({ error: `Title is required (max ${CHORE_TITLE_MAX} characters)` })
      }
      data.title = title
    }
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, CHORE_NOTES_MAX) : null
    }
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') return res.status(400).json({ error: 'active must be a boolean' })
      data.active = body.active
    }
    if (body.assigneeId !== undefined) {
      if (body.assigneeId === null || body.assigneeId === '') {
        data.assigneeId = null
      } else if (typeof body.assigneeId === 'string') {
        const member = await prisma.membership.findUnique({
          where: { userId_householdId: { userId: body.assigneeId, householdId } },
          select: { id: true },
        })
        if (!member) return res.status(400).json({ error: 'Assignee must be a member of this household' })
        data.assigneeId = body.assigneeId
      } else {
        return res.status(400).json({ error: 'Invalid assignee' })
      }
    }
    if (body.recurrenceType !== undefined) {
      const validated = validateRecurrenceInput(body)
      if (!validated.ok) return res.status(400).json({ error: validated.error })
      const recurrence = validated.recurrence
      data.recurrenceType = recurrence.type
      data.daysOfWeek = recurrence.type === 'WEEKLY' ? recurrence.daysOfWeek : []
      data.intervalDays = recurrence.type === 'EVERY_N_DAYS' ? recurrence.intervalDays : null
      data.anchorDate = recurrence.type === 'EVERY_N_DAYS' ? dateOnlyToDb(recurrence.anchorDate) : null
      data.dayOfMonth = recurrence.type === 'MONTHLY' ? recurrence.dayOfMonth : null
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' })

    const chore = await prisma.chore.update({
      where: { id: existing.id },
      data,
      include: { assignee: { select: { id: true, name: true } } },
    })
    return res.status(200).json({ chore: serializeChore(chore) })
  }

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
