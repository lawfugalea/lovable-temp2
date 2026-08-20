import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { requireActiveHousehold } from '@/lib/chores'
import {
  choreRecurrenceFromRow,
  dateOnlyToDb,
  dbDateToDateOnly,
  isDateOnly,
  occurrencesInRange,
} from '@/lib/chore-recurrence'
import { computeStreak, summariseContributions, type CompletionRecord } from '@/lib/chore-stats'

/** Bounded so one request cannot walk an unbounded number of occurrences. */
const MAX_WINDOW_DAYS = 120
const DEFAULT_WINDOW_DAYS = 30

function shiftDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

/**
 * Who is actually doing the chores, and how long the household has kept it up.
 *
 * The client sends its own `today` for the same reason the chores views do: the
 * server has no reliable idea of the household's local date, and being a day out
 * would silently misreport a streak.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  const householdId = await requireActiveHousehold(req, res, userId)
  if (!householdId) return
  res.setHeader('Cache-Control', 'private, no-store')

  const today = typeof req.query.today === 'string' && isDateOnly(req.query.today)
    ? req.query.today
    : new Date().toLocaleDateString('en-CA')
  const requestedDays = Number(req.query.days)
  const windowDays = Number.isInteger(requestedDays) && requestedDays > 0
    ? Math.min(requestedDays, MAX_WINDOW_DAYS)
    : DEFAULT_WINDOW_DAYS
  const from = shiftDays(today, -(windowDays - 1))

  const [chores, members, completions] = await Promise.all([
    prisma.chore.findMany({
      where: { householdId, active: true },
      select: {
        id: true,
        recurrenceType: true,
        daysOfWeek: true,
        intervalDays: true,
        anchorDate: true,
        dayOfMonth: true,
      },
    }),
    prisma.membership.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.choreCompletion.findMany({
      where: {
        chore: { householdId },
        dueDate: { gte: dateOnlyToDb(from), lte: dateOnlyToDb(today) },
      },
      select: { dueDate: true, status: true, completedById: true },
    }),
  ])

  // How many occurrences fell due on each day of the window.
  const dueByDate = new Map<string, number>()
  for (const chore of chores) {
    let occurrences: string[]
    try {
      occurrences = occurrencesInRange(choreRecurrenceFromRow(chore), from, today)
    } catch {
      // A chore whose recurrence columns do not form a valid schedule is left
      // out of the streak rather than breaking the whole panel.
      continue
    }
    for (const date of occurrences) {
      dueByDate.set(date, (dueByDate.get(date) ?? 0) + 1)
    }
  }

  const records: CompletionRecord[] = completions.map(row => ({
    dueDate: dbDateToDateOnly(row.dueDate),
    status: row.status as CompletionRecord['status'],
    completedById: row.completedById,
  }))

  // Both DONE and SKIPPED resolve an occurrence: a chore explicitly skipped is
  // a decision the household made, not an outstanding task.
  const resolvedByDate = new Map<string, number>()
  for (const record of records) {
    resolvedByDate.set(record.dueDate, (resolvedByDate.get(record.dueDate) ?? 0) + 1)
  }

  const contributions = summariseContributions(
    records,
    members.map(member => ({
      userId: member.user.id,
      name: member.user.name || member.user.email,
    })),
  )

  return res.status(200).json({
    from,
    to: today,
    windowDays,
    streakDays: computeStreak(dueByDate, resolvedByDate, today),
    totalDone: records.filter(record => record.status === 'DONE').length,
    totalSkipped: records.filter(record => record.status === 'SKIPPED').length,
    contributions,
  })
}

export default withApiHandler(handler)
