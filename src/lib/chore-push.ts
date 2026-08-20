import { prisma } from '@/lib/prisma'
import { buildTodayView } from '@/lib/chores'
import { appUrl } from '@/lib/links'
import { claimPushEvent, isPushConfigured, sendHouseholdEventPush } from '@/lib/push'

/**
 * One morning push per household summarising the day's chores.
 *
 * Runs on the same 60-second reminder heartbeat as medicine doses, but fires
 * at most once per household per local day: the first poll at or after
 * REMINDER_HOUR claims the day's ledger key — whether or not anything is due —
 * so the today-view arithmetic runs once a day, not once a minute.
 */
const REMINDER_HOUR = 8

function localParts(now: Date, timeZone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    // Intl emits "24" for midnight in some engines; normalize into 0–23.
    hour: Number(get('hour')) % 24,
  }
}

export async function dispatchChoreReminderPush(now = new Date()): Promise<number> {
  if (!isPushConfigured()) return 0
  const timeZone = process.env.HOUSEFLOW_TZ?.trim() || 'Europe/Malta'
  const { date, hour } = localParts(now, timeZone)
  if (hour < REMINDER_HOUR) return 0

  const households = await prisma.chore.findMany({
    where: { active: true },
    select: { householdId: true },
    distinct: ['householdId'],
  })

  let sent = 0
  for (const { householdId } of households) {
    if (!(await claimPushEvent(`chores:${householdId}:${date}`))) continue

    const today = await buildTodayView(householdId, date)
    const pending = today.filter(item => item.status === 'PENDING')
    if (!pending.length) continue

    const overdue = pending.filter(item => item.overdue).length
    const dueToday = pending.length - overdue
    const pieces: string[] = []
    if (dueToday) pieces.push(`${dueToday} chore${dueToday === 1 ? '' : 's'} due today`)
    if (overdue) pieces.push(`${overdue} overdue`)

    sent += await sendHouseholdEventPush({
      householdId,
      payload: {
        body: pieces.join(', '),
        tag: `chores-${householdId}-${date}`,
        url: appUrl('/chores'),
      },
    })
  }
  return sent
}
