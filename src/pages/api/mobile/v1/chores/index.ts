import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileChoresResponse, MobileSaveChoreRequest, MobileSaveChoreResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { isChoreIconId } from '@/lib/chore-icons'
import { dateOnlyToDb, validateRecurrenceInput } from '@/lib/chore-recurrence'
import { CHORE_NOTES_MAX, CHORE_TITLE_MAX, serializeChore } from '@/lib/chores'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileChoresResponse | MobileSaveChoreResponse | MobileApiError

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', ['GET', 'POST']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileSaveChoreRequest>
  const householdId = req.method === 'GET' ? (typeof req.query.householdId === 'string' ? req.query.householdId : '') : body.householdId || ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    const [chores, memberships] = await Promise.all([
      prisma.chore.findMany({ where: { householdId }, include: { assignee: { select: { id: true, name: true } } }, orderBy: [{ active: 'desc' }, { title: 'asc' }] }),
      prisma.membership.findMany({ where: { householdId }, select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } }),
    ])
    return res.status(200).json({ householdId, chores: chores.map(serializeChore), members: memberships.map(row => ({ id: row.user.id, name: row.user.name || row.user.email })) })
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > CHORE_TITLE_MAX) return res.status(400).json({ error: `Title is required (max ${CHORE_TITLE_MAX} characters)` })
  const recurrence = validateRecurrenceInput(body); if (!recurrence.ok) return res.status(400).json({ error: recurrence.error })
  let assigneeId: string | null = null
  if (body.assigneeId) {
    const member = await prisma.membership.findUnique({ where: { userId_householdId: { userId: body.assigneeId, householdId } }, select: { id: true } })
    if (!member) return res.status(400).json({ error: 'Assignee must be a household member' })
    assigneeId = body.assigneeId
  }
  const value = recurrence.recurrence
  let icon: string | null = null
  if (body.icon !== undefined && body.icon !== null && body.icon !== '') {
    if (!isChoreIconId(body.icon)) return res.status(400).json({ error: 'Unknown icon' })
    icon = body.icon
  }
  const chore = await prisma.chore.create({ data: { householdId, title, icon, notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, CHORE_NOTES_MAX) || null : null, assigneeId, recurrenceType: value.type, daysOfWeek: value.type === 'WEEKLY' ? value.daysOfWeek : [], intervalDays: value.type === 'EVERY_N_DAYS' ? value.intervalDays : null, anchorDate: value.type === 'EVERY_N_DAYS' ? dateOnlyToDb(value.anchorDate) : null, dayOfMonth: value.type === 'MONTHLY' ? value.dayOfMonth : null }, include: { assignee: { select: { id: true, name: true } } } })
  return res.status(201).json({ chore: serializeChore(chore) })
}

export default withApiHandler(handler)
