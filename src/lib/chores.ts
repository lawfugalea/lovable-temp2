import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from './prisma'
import {
  choreRecurrenceFromRow,
  dbDateToDateOnly,
  describeRecurrence,
  isDueOn,
  lastScheduledOnOrBefore,
  type ChoreRecurrence,
} from './chore-recurrence'

export const CHORE_TITLE_MAX = 200
export const CHORE_NOTES_MAX = 2000

/** Resolve the caller's active household and confirm membership, or respond 4xx. */
export async function requireActiveHousehold(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  })
  const householdId = user?.activeHouseholdId
  if (!householdId) {
    res.status(400).json({ error: 'No active household selected' })
    return null
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId, householdId } },
    select: { id: true },
  })
  if (!membership) {
    res.status(403).json({ error: 'Active household is no longer available' })
    return null
  }
  return householdId
}

export interface ChoreRow {
  id: string
  title: string
  notes: string | null
  recurrenceType: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'
  daysOfWeek: number[]
  intervalDays: number | null
  anchorDate: Date | null
  dayOfMonth: number | null
  active: boolean
  assignee: { id: string; name: string | null } | null
}

export function serializeChore(chore: ChoreRow) {
  const recurrence = choreRecurrenceFromRow(chore)
  return {
    id: chore.id,
    title: chore.title,
    notes: chore.notes,
    active: chore.active,
    assignee: chore.assignee,
    recurrenceType: chore.recurrenceType,
    daysOfWeek: chore.daysOfWeek,
    intervalDays: chore.intervalDays,
    anchorDate: chore.anchorDate ? dbDateToDateOnly(chore.anchorDate) : null,
    dayOfMonth: chore.dayOfMonth,
    schedule: describeRecurrence(recurrence),
  }
}

export interface TodayChoreItem {
  chore: ReturnType<typeof serializeChore>
  dueDate: string
  overdue: boolean
  status: 'PENDING' | 'DONE' | 'SKIPPED'
  completedBy: { id: string; name: string | null } | null
}

/**
 * One row per active chore that has something to show for `date`:
 * an occurrence due today, or the most recent unresolved occurrence
 * from the past week (overdue).
 */
export async function buildTodayView(householdId: string, date: string): Promise<TodayChoreItem[]> {
  const chores = await prisma.chore.findMany({
    where: { householdId, active: true },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { title: 'asc' },
  })
  if (!chores.length) return []

  const items: Array<{ chore: (typeof chores)[number]; recurrence: ChoreRecurrence; dueDate: string; overdue: boolean }> = []
  for (const chore of chores) {
    const recurrence = choreRecurrenceFromRow(chore)
    if (isDueOn(recurrence, date)) {
      items.push({ chore, recurrence, dueDate: date, overdue: false })
      continue
    }
    const last = lastScheduledOnOrBefore(recurrence, date)
    if (last && last !== date) items.push({ chore, recurrence, dueDate: last, overdue: true })
  }
  if (!items.length) return []

  const completions = await prisma.choreCompletion.findMany({
    where: { OR: items.map(item => ({ choreId: item.chore.id, dueDate: new Date(`${item.dueDate}T00:00:00.000Z`) })) },
    include: { completedBy: { select: { id: true, name: true } } },
  })
  const completionKey = (choreId: string, dueDate: string) => `${choreId}:${dueDate}`
  const byKey = new Map(completions.map(row => [completionKey(row.choreId, dbDateToDateOnly(row.dueDate)), row]))

  return items
    .map(item => {
      const completion = byKey.get(completionKey(item.chore.id, item.dueDate))
      return {
        chore: serializeChore(item.chore),
        dueDate: item.dueDate,
        overdue: item.overdue,
        status: (completion?.status ?? 'PENDING') as TodayChoreItem['status'],
        completedBy: completion?.completedBy ?? null,
      }
    })
    // Overdue-but-resolved occurrences are history, not today's work.
    .filter(item => !(item.overdue && item.status !== 'PENDING'))
}
