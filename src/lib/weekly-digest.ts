import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/links'
import { buildTodayView } from '@/lib/chores'
import { summariseContributions, type CompletionRecord } from '@/lib/chore-stats'
import { dbDateToDateOnly } from '@/lib/chore-recurrence'
import { isBankingAllowedEmail } from '@/lib/banking-allowlist'
import { sendWeeklyDigestEmail, type DigestSection } from '@/lib/mailer'
import { claimPushEvent } from '@/lib/push'
import type { FinanceAccess } from '@/lib/finance/access'
import { buildBankingAnalytics } from '@/lib/finance/analytics'
import { loadAnalyticsInput } from '@/lib/finance/analytics-server'
import { money } from '@/lib/finance/format'

/**
 * The Monday morning household digest.
 *
 * Polled hourly by the digest worker; sends once per household per week, on
 * the first poll at or after DIGEST_HOUR local time on Monday. The PushEvent
 * ledger provides the once-only claim (it is a generic dedupe table despite
 * the name; keys live well past a week).
 *
 * Recipients are the household's members, minus demo accounts and anyone who
 * opted out. The banking paragraph is per-recipient: only accounts on the
 * banking allowlist ever see money figures, mirroring the app itself.
 */
const DIGEST_HOUR = 7
const WEEK_DAYS = 7

function localParts(now: Date, timeZone: string): { date: string; hour: number; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'short',
  }).formatToParts(now)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    weekday: get('weekday'),
  }
}

async function choresSection(householdId: string, date: string, members: { userId: string; name: string }[]): Promise<DigestSection | null> {
  const weekStart = new Date(`${date}T00:00:00.000Z`)
  weekStart.setUTCDate(weekStart.getUTCDate() - WEEK_DAYS)
  const completions = await prisma.choreCompletion.findMany({
    where: {
      chore: { householdId },
      dueDate: { gte: weekStart, lt: new Date(`${date}T00:00:00.000Z`) },
    },
    select: { dueDate: true, status: true, completedById: true },
  })
  const today = await buildTodayView(householdId, date)
  const pendingToday = today.filter(item => item.status === 'PENDING').length

  if (!completions.length && !pendingToday) return null

  const records: CompletionRecord[] = completions.map(row => ({
    dueDate: dbDateToDateOnly(row.dueDate),
    status: row.status as CompletionRecord['status'],
    completedById: row.completedById,
  }))
  const contributions = summariseContributions(records, members)
  const doneTotal = contributions.reduce((sum, member) => sum + member.doneCount, 0)
  const top = contributions[0]

  return {
    label: 'Chores',
    value: `${doneTotal} done last week, ${pendingToday} due today`,
    detail: top && top.doneCount > 0
      ? `${top.name} led the week with ${top.doneCount} (${top.sharePercent}%)`
      : undefined,
  }
}

async function shoppingSection(householdId: string): Promise<DigestSection | null> {
  const activeItems = await prisma.shoppingItem.count({
    where: { status: 'ACTIVE', list: { householdId, archivedAt: null } },
  })
  if (!activeItems) return null
  return {
    label: 'Shopping',
    value: `${activeItems} item${activeItems === 1 ? '' : 's'} waiting on the lists`,
  }
}

async function mealsSection(householdId: string, date: string): Promise<DigestSection | null> {
  const weekEnd = new Date(`${date}T00:00:00.000Z`)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + WEEK_DAYS)
  const planned = await prisma.mealPlanEntry.count({
    where: { householdId, date: { gte: new Date(`${date}T00:00:00.000Z`), lt: weekEnd } },
  })
  if (!planned) return null
  return {
    label: 'Meals',
    value: `${planned} meal${planned === 1 ? '' : 's'} planned for the coming week`,
  }
}

async function medicineSection(householdId: string): Promise<DigestSection | null> {
  const active = await prisma.medicine.count({
    where: { householdId, isTemplate: false, isActive: true },
  })
  if (!active) return null
  return {
    label: 'Medicine',
    value: `${active} active medicine${active === 1 ? '' : 's'} being tracked`,
  }
}

/** Money paragraph for banking-allowlisted recipients only. */
async function bankingSection(recipient: { userId: string; email: string }, householdId: string, now: Date): Promise<DigestSection | null> {
  if (!isBankingAllowedEmail(recipient.email)) return null
  const hasConnection = await prisma.bankConnection.count({
    where: { userId: recipient.userId, status: { in: ['ACTIVE', 'REAUTH_REQUIRED'] } },
  })
  if (!hasConnection) return null

  const access: FinanceAccess = {
    userId: recipient.userId,
    email: recipient.email,
    householdId,
    canManage: true,
    bankEnabled: true,
  }
  const loaded = await loadAnalyticsInput({ access, periodDays: WEEK_DAYS, now })
  if (!loaded.ok) return null
  const analytics = buildBankingAnalytics(loaded.input)
  const primary = analytics.currencies[0]
  if (!primary) return null

  return {
    label: 'Spending',
    value: `${money(primary.summary.netSpendingCents, { currency: primary.currency })} spent in the last 7 days`,
    detail: `${money(primary.summary.incomeCents, { currency: primary.currency })} came in`,
  }
}

export interface DigestReport {
  households: number
  emails: number
}

export async function dispatchWeeklyDigest(now = new Date()): Promise<DigestReport> {
  const report: DigestReport = { households: 0, emails: 0 }
  const timeZone = process.env.HOUSEFLOW_TZ?.trim() || 'Europe/Malta'
  const { date, hour, weekday } = localParts(now, timeZone)
  if (weekday !== 'Mon' || hour < DIGEST_HOUR) return report

  const households = await prisma.household.findMany({
    where: { members: { some: {} } },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: { id: true, name: true, email: true, isDemo: true, weeklyDigestOptOut: true },
          },
        },
      },
    },
  })

  const digestUrl = appUrl('/dashboard')
  const settingsUrl = appUrl('/settings?tab=notifications')

  for (const household of households) {
    const recipients = household.members
      .map(membership => membership.user)
      .filter(user => !user.isDemo && !user.weeklyDigestOptOut)
    if (!recipients.length) continue

    if (!(await claimPushEvent(`digest:${household.id}:${date}`))) continue
    report.households += 1

    const members = household.members.map(membership => ({
      userId: membership.user.id,
      name: membership.user.name ?? membership.user.email,
    }))

    const shared = (await Promise.all([
      choresSection(household.id, date, members),
      shoppingSection(household.id),
      mealsSection(household.id, date),
      medicineSection(household.id),
    ])).filter((section): section is DigestSection => section !== null)

    // A household with nothing going on gets silence, not an empty email.
    if (!shared.length) continue

    for (const recipient of recipients) {
      try {
        const banking = await bankingSection({ userId: recipient.id, email: recipient.email }, household.id, now)
        const result = await sendWeeklyDigestEmail({
          to: recipient.email,
          name: recipient.name,
          householdName: household.name,
          sections: banking ? [...shared, banking] : shared,
          digestUrl,
          settingsUrl,
        })
        if (result.ok) report.emails += 1
        else console.warn('[weekly-digest] send failed:', recipient.id, result.error)
      } catch (error) {
        console.warn('[weekly-digest] recipient failed:', recipient.id, error instanceof Error ? error.message : error)
      }
    }
  }

  return report
}
