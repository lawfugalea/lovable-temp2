import { createHash } from 'node:crypto'
import { normalizeMerchantKey } from './metadata'

export type CoachTransaction = {
  id: string
  accountId: string
  merchantName: string
  category: string
  signedAmount: number
  currency: string
  bookingDate: Date | string | null
  status?: string
}

export type CoachSignal = {
  key: string
  kind: 'SPEND_TREND' | 'FREQUENCY' | 'SMALL_PURCHASES' | 'CONCENTRATION'
  title: string
  explanation: string
  suggestion: string
  merchantName: string | null
  category: string | null
  currency: string
  currentValue: number
  previousValue: number | null
  percentageChange: number | null
  transactionIds: string[]
  accountId: string | null
}

export type FinanceLimitLike = {
  id: string
  accountId: string | null
  scope: 'CATEGORY' | 'MERCHANT' | string
  scopeKey: string
  displayName: string
  amount: number | string | { toString(): string }
  currency: string
  enabled: boolean
}

export type LimitProgress = {
  id: string
  accountId: string | null
  scope: string
  scopeKey: string
  displayName: string
  amount: number
  currency: string
  spent: number
  percentage: number
  projected: number
  exceeded: boolean
}

export const COACH_EXCLUDED_CATEGORIES = new Set(['Income', 'Refunds', 'Transfers', 'Cash', 'Bills & utilities'])

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function utcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function signalKey(kind: CoachSignal['kind'], currency: string, label: string): string {
  return createHash('sha256').update(`${kind}|${currency}|${label}`).digest('hex').slice(0, 32)
}

function accountFor(items: CoachTransaction[]): string | null {
  const ids = new Set(items.map(item => item.accountId))
  return ids.size === 1 ? [...ids][0] : null
}

function eligible(transaction: CoachTransaction, confirmedSubscriptionKeys: Set<string>): boolean {
  return transaction.signedAmount < 0
    && transaction.status !== 'PENDING'
    && !COACH_EXCLUDED_CATEGORIES.has(transaction.category)
    && !confirmedSubscriptionKeys.has(`${transaction.accountId}|${normalizeMerchantKey(transaction.merchantName)}`)
}

export function buildCoachSignals(
  transactions: CoachTransaction[],
  confirmedSubscriptionKeys = new Set<string>(),
  now = new Date(),
): CoachSignal[] {
  const today = utcDay(now)
  const currentFrom = addDays(today, -29)
  const previousFrom = addDays(currentFrom, -30)
  const currentEnd = addDays(today, 1)
  const parsed = transactions
    .filter(transaction => eligible(transaction, confirmedSubscriptionKeys) && transaction.bookingDate)
    .map(transaction => ({ ...transaction, date: new Date(transaction.bookingDate!) }))
    .filter(transaction => !Number.isNaN(transaction.date.getTime()))
  const current = parsed.filter(transaction => transaction.date >= currentFrom && transaction.date < currentEnd)
  const previous = parsed.filter(transaction => transaction.date >= previousFrom && transaction.date < currentFrom)
  const signals: CoachSignal[] = []

  for (const dimension of ['category', 'merchant'] as const) {
    const currentGroups = new Map<string, typeof current>()
    const previousGroups = new Map<string, typeof previous>()
    const label = (transaction: typeof current[number]) => dimension === 'category' ? transaction.category : transaction.merchantName
    for (const transaction of current) {
      const key = `${transaction.currency.toUpperCase()}|${label(transaction)}`
      currentGroups.set(key, [...(currentGroups.get(key) || []), transaction])
    }
    for (const transaction of previous) {
      const key = `${transaction.currency.toUpperCase()}|${label(transaction)}`
      previousGroups.set(key, [...(previousGroups.get(key) || []), transaction])
    }
    for (const [key, items] of currentGroups) {
      const oldItems = previousGroups.get(key) || []
      const currentSpend = items.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)
      const previousSpend = oldItems.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)
      const [currency, ...labelParts] = key.split('|')
      const groupLabel = labelParts.join('|')
      if (items.length >= 5 && previousSpend > 0 && currentSpend - previousSpend >= 25 && currentSpend >= previousSpend * 1.25) {
        const change = round((currentSpend - previousSpend) / previousSpend * 100)
        signals.push({
          key: signalKey('SPEND_TREND', currency, `${dimension}|${groupLabel}`),
          kind: 'SPEND_TREND',
          title: `${groupLabel} spending is higher`,
          explanation: `You spent ${change}% more here than in the previous 30 days (${items.length} purchases).`,
          suggestion: 'Review the matching purchases or set a monthly limit if you want a gentle boundary.',
          merchantName: dimension === 'merchant' ? groupLabel : null,
          category: dimension === 'category' ? groupLabel : null,
          currency,
          currentValue: round(currentSpend),
          previousValue: round(previousSpend),
          percentageChange: change,
          transactionIds: items.map(item => item.id),
          accountId: accountFor(items),
        })
      }
      if (oldItems.length > 0 && items.length - oldItems.length >= 3 && items.length >= oldItems.length * 1.3) {
        const change = round((items.length - oldItems.length) / oldItems.length * 100)
        signals.push({
          key: signalKey('FREQUENCY', currency, `${dimension}|${groupLabel}`),
          kind: 'FREQUENCY',
          title: `${groupLabel} is appearing more often`,
          explanation: `${items.length} purchases in the last 30 days, up from ${oldItems.length} in the previous period.`,
          suggestion: 'Look at the dates below to see whether this is intentional or becoming automatic.',
          merchantName: dimension === 'merchant' ? groupLabel : null,
          category: dimension === 'category' ? groupLabel : null,
          currency,
          currentValue: items.length,
          previousValue: oldItems.length,
          percentageChange: change,
          transactionIds: items.map(item => item.id),
          accountId: accountFor(items),
        })
      }
    }
  }

  const weekFrom = addDays(today, -6)
  const weeklySmall = new Map<string, typeof current>()
  for (const transaction of current.filter(item => item.date >= weekFrom && Math.abs(item.signedAmount) <= 15)) {
    const key = `${transaction.currency.toUpperCase()}|${transaction.merchantName}`
    weeklySmall.set(key, [...(weeklySmall.get(key) || []), transaction])
  }
  for (const [key, items] of weeklySmall) {
    const total = items.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)
    if (items.length < 4 || total < 30) continue
    const [currency, ...merchantParts] = key.split('|')
    const merchantName = merchantParts.join('|')
    signals.push({
      key: signalKey('SMALL_PURCHASES', currency, merchantName),
      kind: 'SMALL_PURCHASES',
      title: `Frequent small purchases at ${merchantName}`,
      explanation: `${items.length} purchases of €15 or less added up to ${round(total)} ${currency} this week.`,
      suggestion: 'Small purchases can be easy to miss; decide whether this total still feels worthwhile.',
      merchantName,
      category: null,
      currency,
      currentValue: round(total),
      previousValue: null,
      percentageChange: null,
      transactionIds: items.map(item => item.id),
      accountId: accountFor(items),
    })
  }

  const currencyTotals = new Map<string, number>()
  const merchantTotals = new Map<string, typeof current>()
  for (const transaction of current) {
    const currency = transaction.currency.toUpperCase()
    currencyTotals.set(currency, (currencyTotals.get(currency) || 0) + Math.abs(transaction.signedAmount))
    const key = `${currency}|${transaction.merchantName}`
    merchantTotals.set(key, [...(merchantTotals.get(key) || []), transaction])
  }
  for (const [key, items] of merchantTotals) {
    const [currency, ...merchantParts] = key.split('|')
    const merchantName = merchantParts.join('|')
    const spend = items.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)
    const total = currencyTotals.get(currency) || 0
    const share = total > 0 ? spend / total * 100 : 0
    if (spend < 50 || share < 35) continue
    signals.push({
      key: signalKey('CONCENTRATION', currency, merchantName),
      kind: 'CONCENTRATION',
      title: `${merchantName} is a large share of discretionary spend`,
      explanation: `${round(share)}% of discretionary spending in the last 30 days went to this merchant.`,
      suggestion: 'This may be completely intentional; the card simply makes the concentration visible.',
      merchantName,
      category: null,
      currency,
      currentValue: round(spend),
      previousValue: null,
      percentageChange: round(share),
      transactionIds: items.map(item => item.id),
      accountId: accountFor(items),
    })
  }

  return signals.sort((left, right) => right.currentValue - left.currentValue).slice(0, 20)
}

export function buildLimitProgress(limits: FinanceLimitLike[], transactions: CoachTransaction[], now = new Date()): LimitProgress[] {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const dayOfMonth = Math.max(1, now.getUTCDate())
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  return limits.filter(limit => limit.enabled).map(limit => {
    const matches = transactions.filter(transaction => {
      if (transaction.signedAmount >= 0 || !transaction.bookingDate || transaction.status === 'PENDING') return false
      const date = new Date(transaction.bookingDate)
      if (date < start || date >= end || transaction.currency.toUpperCase() !== limit.currency.toUpperCase()) return false
      if (limit.accountId && transaction.accountId !== limit.accountId) return false
      return limit.scope === 'CATEGORY'
        ? transaction.category === limit.scopeKey
        : normalizeMerchantKey(transaction.merchantName) === limit.scopeKey
    })
    const spent = matches.reduce((sum, transaction) => sum + Math.abs(transaction.signedAmount), 0)
    const amount = Number(limit.amount)
    return {
      id: limit.id,
      accountId: limit.accountId,
      scope: limit.scope,
      scopeKey: limit.scopeKey,
      displayName: limit.displayName,
      amount: round(amount),
      currency: limit.currency.toUpperCase(),
      spent: round(spent),
      percentage: amount > 0 ? round(spent / amount * 100) : 0,
      projected: round(spent / dayOfMonth * daysInMonth),
      exceeded: amount > 0 && spent > amount,
    }
  })
}
