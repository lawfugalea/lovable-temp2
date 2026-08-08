/**
 * Monthly limits and upcoming recurring payments.
 *
 * Both were previously computed in ways that read as authoritative but were not:
 * limit progress counted internal transfers and cash against a category limit,
 * and projected month-end spend by scaling the month-to-date figure by the day of
 * the month — so €50 spent on the 2nd projected €775.
 */
import type {
  AnalyticsLimitInput,
  AnalyticsSubscriptionInput,
  AnalyticsTransactionInput,
  BudgetProgress,
  UpcomingBill,
} from './analytics-types'
import type { FlowClass } from './classification'
import { type Cents, meanCents, percentOf } from './money'
import { normalizeMerchantKey } from './merchant-key'
import { type DetectedSubscription, subscriptionDueState } from './subscriptions'

/** Below this many days elapsed, a linear month-end projection is noise. */
const MIN_PROJECTION_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type ClassifiedTransaction = AnalyticsTransactionInput & { flowClass: FlowClass }

function monthWindow(now: Date): { start: Date; end: Date; daysElapsed: number; daysInMonth: number } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  return { start, end, daysElapsed: Math.min(Math.max(1, now.getUTCDate()), daysInMonth), daysInMonth }
}

function matchesLimit(transaction: ClassifiedTransaction, limit: AnalyticsLimitInput): boolean {
  if (transaction.currency.toUpperCase() !== limit.currency.toUpperCase()) return false
  if (limit.accountId && transaction.accountId !== limit.accountId) return false
  return limit.scope === 'CATEGORY'
    ? transaction.category === limit.scopeKey
    : normalizeMerchantKey(transaction.merchantName) === limit.scopeKey
}

/**
 * Progress against each enabled limit for the current calendar month.
 *
 * Only real spending counts, and refunds against the same scope reduce it, so a
 * returned purchase stops eating the household's budget. The projection is
 * withheld until a week of the month has passed and can never come in below what
 * has already been spent.
 */
export function buildBudgetProgress(
  limits: readonly AnalyticsLimitInput[],
  transactions: readonly ClassifiedTransaction[],
  now: Date,
): BudgetProgress[] {
  const { start, end, daysElapsed, daysInMonth } = monthWindow(now)
  const inMonth = transactions.filter(transaction => {
    if (transaction.status === 'PENDING' || !transaction.bookingDate) return false
    return transaction.bookingDate >= start && transaction.bookingDate < end
  })

  return limits.filter(limit => limit.enabled).map(limit => {
    let spentCents = 0
    for (const transaction of inMonth) {
      if (!matchesLimit(transaction, limit)) continue
      if (transaction.flowClass === 'SPENDING') spentCents += Math.abs(transaction.amountCents)
      else if (transaction.flowClass === 'REFUND') spentCents -= Math.abs(transaction.amountCents)
    }
    spentCents = Math.max(0, spentCents)
    const enoughElapsed = daysElapsed >= MIN_PROJECTION_DAYS
    return {
      id: limit.id,
      accountId: limit.accountId,
      scope: limit.scope,
      scopeKey: limit.scopeKey,
      displayName: limit.displayName,
      limitCents: limit.amountCents,
      spentCents,
      percentage: percentOf(spentCents, limit.amountCents) ?? 0,
      projectedCents: enoughElapsed
        ? Math.max(spentCents, meanCents(spentCents * daysInMonth, daysElapsed))
        : null,
      projectionBasis: enoughElapsed ? 'ELAPSED_DAYS' : 'INSUFFICIENT_DATA',
      exceeded: limit.amountCents > 0 && spentCents > limit.amountCents,
      currency: limit.currency.toUpperCase(),
    }
  })
}

function daysUntil(date: Date, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const due = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.round((due - today) / DAY_MS)
}

/**
 * What is due in the next `horizonDays`.
 *
 * Confirmed subscriptions win over detected candidates for the same account and
 * merchant, because the household has already told us those are real. Anything
 * already overdue is always included, however far in the past it sits.
 *
 * Note the detection limit: `detectSubscriptions` needs roughly three cycles, so
 * weekly to quarterly payments surface on their own but a yearly bill only
 * appears once it has been confirmed.
 */
export function buildUpcomingBills(
  stored: readonly AnalyticsSubscriptionInput[],
  detected: readonly DetectedSubscription[],
  currency: string,
  now: Date,
  horizonDays = 30,
): UpcomingBill[] {
  const bills: UpcomingBill[] = []
  const seen = new Set<string>()

  const add = (bill: UpcomingBill, key: string) => {
    if (seen.has(key)) return
    if (bill.daysUntilDue > horizonDays) return
    seen.add(key)
    bills.push(bill)
  }

  for (const subscription of stored) {
    if (subscription.status !== 'CONFIRMED') continue
    if (subscription.currency.toUpperCase() !== currency) continue
    if (!subscription.nextExpectedDate) continue
    const due = new Date(subscription.nextExpectedDate)
    if (Number.isNaN(due.getTime())) continue
    const state = subscriptionDueState(due, subscription.reminderDays, now)
    if (!state) continue
    add({
      id: subscription.id,
      merchantName: subscription.displayName,
      merchantKey: subscription.merchantKey,
      accountId: subscription.accountId,
      amountCents: subscription.expectedAmountCents,
      dueDate: due.toISOString().slice(0, 10),
      daysUntilDue: daysUntil(due, now),
      cadence: subscription.cadence,
      state,
      source: 'CONFIRMED',
      confidence: null,
    }, `${subscription.accountId}|${subscription.merchantKey}`)
  }

  for (const candidate of detected) {
    if (candidate.currency.toUpperCase() !== currency) continue
    const due = new Date(candidate.nextExpectedDate)
    if (Number.isNaN(due.getTime())) continue
    const state = subscriptionDueState(due, 3, now)
    if (!state) continue
    add({
      id: `detected:${candidate.accountId}:${candidate.merchantKey}`,
      merchantName: candidate.displayName,
      merchantKey: candidate.merchantKey,
      accountId: candidate.accountId,
      amountCents: Math.round(Math.abs(candidate.expectedAmount) * 100) as Cents,
      dueDate: due.toISOString().slice(0, 10),
      daysUntilDue: daysUntil(due, now),
      cadence: candidate.cadence,
      state,
      source: 'DETECTED',
      confidence: candidate.confidence,
    }, `${candidate.accountId}|${candidate.merchantKey}`)
  }

  return bills.sort((left, right) => left.daysUntilDue - right.daysUntilDue
    || right.amountCents - left.amountCents
    || left.merchantName.localeCompare(right.merchantName))
}
