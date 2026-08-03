import { prisma } from '@/lib/prisma'
import { withBasePath } from '@/lib/base-path'
import { isPushConfigured, sendUserEventPush } from '@/lib/push'
import type { FinanceAccess } from './access'
import { buildBankingAnalytics } from './analytics'
import { loadAnalyticsInput } from './analytics-server'

/**
 * Push alerts when a monthly limit crosses 80% or 100% of its budget.
 *
 * Evaluated right after a sync lands new transactions, because that is the
 * only moment progress can change. Each limit sends at most one 80% and one
 * 100% alert per calendar month (the PushEvent ledger key carries the month),
 * and a limit that jumps straight past 100% sends only the 100% alert.
 */
const THRESHOLDS = [100, 80] as const

/** Month-to-date always fits inside this analytics window. */
const PERIOD_DAYS = 35

export async function dispatchBudgetAlerts(userId: string, now = new Date()): Promise<number> {
  if (!isPushConfigured()) return 0
  const limitCount = await prisma.financeLimit.count({ where: { userId, enabled: true } })
  if (!limitCount) return 0

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      activeHouseholdId: true,
      memberships: { select: { householdId: true }, take: 1 },
    },
  })
  const householdId = user?.activeHouseholdId ?? user?.memberships[0]?.householdId ?? null
  if (!user?.email || !householdId) return 0

  // The same lens the owner sees in the app: their accounts plus what is
  // shared with their household. Entitlement enforcement stays inside the
  // push helper, which refuses households without push reminders.
  const access: FinanceAccess = {
    userId,
    email: user.email,
    householdId,
    canManage: true,
    bankEnabled: true,
  }
  const loaded = await loadAnalyticsInput({ access, periodDays: PERIOD_DAYS, now })
  if (!loaded.ok) return 0

  const analytics = buildBankingAnalytics(loaded.input)
  const monthKey = now.toISOString().slice(0, 7)

  let sent = 0
  for (const currencyEntry of analytics.currencies) {
    for (const budget of currencyEntry.budgets) {
      const threshold = THRESHOLDS.find(value => budget.percentage >= value)
      if (threshold === undefined) continue
      sent += await sendUserEventPush({
        userId,
        dedupeKey: `budget:${budget.id}:${monthKey}:${threshold}`,
        payload: {
          body: threshold >= 100
            ? `${budget.displayName} is over its monthly limit.`
            : `${budget.displayName} has used ${Math.round(budget.percentage)}% of its monthly limit.`,
          tag: `budget-${budget.id}-${monthKey}`,
          url: withBasePath('/banking'),
        },
      })
    }
  }
  return sent
}
