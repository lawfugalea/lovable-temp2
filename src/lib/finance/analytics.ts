/**
 * The single implementation of every banking statistic.
 *
 * The dashboard, the analytics page, the coach and the AI payload all read from
 * here, so they cannot disagree about what was spent — which is exactly how the
 * old overview and statistics tabs came to show different numbers for the same
 * period.
 *
 * Pure: plain objects in, plain objects out, `now` injected. No Prisma, no clock.
 */
import type { FinanceCategory } from './enrichment'
import { classifyFlow, type FlowClass } from './classification'
import {
  type AnalyticsInput,
  type AnalyticsTransaction,
  type AnalyticsTransactionInput,
  type BankingAnalytics,
  type CategoryStat,
  type CoverageInfo,
  type CurrencyAnalytics,
  type CurrentMonthFlow,
  type DailyFlow,
  type DataQuality,
  type FlowCounts,
  type InternalTransfersSummary,
  type MerchantStat,
  type MoneyFlowSummary,
  type MonthlyFlow,
} from './analytics-types'
import { buildBudgetProgress, buildUpcomingBills, type ClassifiedTransaction } from './budgets'
import { deriveBalanceTrend } from './balance-trend'
import { type Cents, changePercent, meanCents, percentOf } from './money'
import { detectSubscriptions } from './subscriptions'
import { buildOwnAccountIdentifiers, matchInternalTransfers, type TransferCandidate } from './transfers'

const DAY_MS = 24 * 60 * 60 * 1000
const SPARKLINE_MONTHS = 6

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS)
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / DAY_MS)
}

export function analyticsDateRange(periodDays: number, now: Date) {
  const dateTo = startOfUtcDay(now)
  const dateFrom = addDays(dateTo, -(periodDays - 1))
  return { dateFrom, dateTo, currentEnd: addDays(dateTo, 1), previousFrom: addDays(dateFrom, -periodDays) }
}

function emptyCounts(): FlowCounts {
  return {
    total: 0,
    spending: 0,
    income: 0,
    refund: 0,
    internalMatched: 0,
    internalUnmatchedIn: 0,
    internalUnmatchedOut: 0,
    zero: 0,
    unknownSign: 0,
    pending: 0,
  }
}

const COUNT_KEYS: Record<FlowClass, keyof FlowCounts> = {
  SPENDING: 'spending',
  INCOME: 'income',
  REFUND: 'refund',
  INTERNAL_MATCHED: 'internalMatched',
  INTERNAL_UNMATCHED_IN: 'internalUnmatchedIn',
  INTERNAL_UNMATCHED_OUT: 'internalUnmatchedOut',
  ZERO: 'zero',
  UNKNOWN_SIGN: 'unknownSign',
}

type Totals = { incomeCents: Cents; spendingCents: Cents; refundsCents: Cents }

function accumulate(totals: Totals, flow: FlowClass, amountCents: Cents): void {
  if (flow === 'INCOME') totals.incomeCents += amountCents
  else if (flow === 'SPENDING') totals.spendingCents += Math.abs(amountCents)
  else if (flow === 'REFUND') totals.refundsCents += Math.abs(amountCents)
}

function coverageFor(
  periodDays: number,
  range: { dateFrom: Date; dateTo: Date; previousFrom: Date },
  earliest: Date | null,
): CoverageInfo {
  // Measured from the first transaction we hold in *any* window, so a genuinely
  // quiet month is not mistaken for missing data.
  const coveredFrom = earliest && earliest > range.dateFrom ? startOfUtcDay(earliest) : range.dateFrom
  const coveredDays = Math.max(1, Math.min(periodDays, daysBetween(coveredFrom, range.dateTo) + 1))
  return {
    periodDays,
    coveredDays,
    dataStartDate: earliest ? isoDate(earliest) : null,
    dateFrom: isoDate(range.dateFrom),
    dateTo: isoDate(range.dateTo),
    complete: coveredDays >= periodDays,
    previousCovered: earliest !== null && startOfUtcDay(earliest) <= range.previousFrom,
  }
}

function buildSummary(
  current: Totals,
  previous: Totals,
  counts: FlowCounts,
  largestExpenseCents: Cents,
  coverage: CoverageInfo,
  balanceChangeCents: Cents,
): MoneyFlowSummary {
  const netSpendingCents = current.spendingCents - current.refundsCents
  const netCents = current.incomeCents - netSpendingCents
  const previousNetCents = previous.incomeCents - (previous.spendingCents - previous.refundsCents)
  const netChangeCents = netCents - previousNetCents
  return {
    incomeCents: current.incomeCents,
    spendingCents: current.spendingCents,
    refundsCents: current.refundsCents,
    netSpendingCents,
    netCents,
    balanceChangeCents,
    savingsRatePercent: current.incomeCents > 0
      ? Math.round((netCents / current.incomeCents) * 1000) / 10
      : null,
    largestExpenseCents,
    averageSpendPerTransactionCents: meanCents(current.spendingCents, counts.spending),
    averageSpendPerDayCents: meanCents(current.spendingCents, coverage.coveredDays),
    averageSpendPerMonthCents: meanCents(current.spendingCents * 30, coverage.coveredDays),
    counts,
    comparison: {
      previousIncomeCents: previous.incomeCents,
      previousSpendingCents: previous.spendingCents,
      previousNetCents,
      spendingChangePercent: changePercent(current.spendingCents, previous.spendingCents),
      incomeChangePercent: changePercent(current.incomeCents, previous.incomeCents),
      netChangeCents,
      netDirection: netChangeCents === 0 ? 'FLAT' : netChangeCents > 0 ? 'UP' : 'DOWN',
    },
  }
}

type CategoryBucket = {
  amountCents: Cents
  count: number
  largestCents: Cents
  merchants: Map<string, { merchantName: string; amountCents: Cents; count: number }>
}

type MerchantBucket = {
  merchantName: string
  names: Map<string, number>
  amountCents: Cents
  count: number
  categories: Map<FinanceCategory, { amountCents: Cents; count: number }>
  firstSeen: string
  lastSeen: string
}

function buildCategories(
  buckets: Map<FinanceCategory, CategoryBucket>,
  previous: Map<FinanceCategory, Cents>,
  spendingCents: Cents,
): CategoryStat[] {
  // The union of both windows, so a category that fell to zero still reports the
  // drop instead of vanishing from the comparison.
  const categories = new Set<FinanceCategory>([...buckets.keys(), ...previous.keys()])
  return [...categories]
    .map(category => {
      const bucket = buckets.get(category)
      const amountCents = bucket?.amountCents ?? 0
      const previousAmountCents = previous.get(category) ?? 0
      const merchants = [...(bucket?.merchants ?? new Map())]
        .map(([merchantKey, merchant]) => ({
          merchantKey,
          merchantName: merchant.merchantName,
          amountCents: merchant.amountCents,
          count: merchant.count,
          sharePercent: percentOf(merchant.amountCents, amountCents) ?? 0,
        }))
        .sort((left, right) => right.amountCents - left.amountCents
          || left.merchantName.localeCompare(right.merchantName))
      return {
        category,
        amountCents,
        previousAmountCents,
        changeCents: amountCents - previousAmountCents,
        changePercent: changePercent(amountCents, previousAmountCents),
        count: bucket?.count ?? 0,
        sharePercent: percentOf(amountCents, spendingCents) ?? 0,
        averageCents: meanCents(amountCents, bucket?.count ?? 0),
        largestCents: bucket?.largestCents ?? 0,
        merchantCount: merchants.length,
        merchants,
      }
    })
    .sort((left, right) => right.amountCents - left.amountCents
      || right.previousAmountCents - left.previousAmountCents
      || left.category.localeCompare(right.category))
}

function buildMerchants(buckets: Map<string, MerchantBucket>, spendingCents: Cents): MerchantStat[] {
  return [...buckets]
    .map(([merchantKey, bucket]) => {
      const categories = [...bucket.categories]
        .map(([category, values]) => ({ category, amountCents: values.amountCents, count: values.count }))
        .sort((left, right) => right.amountCents - left.amountCents)
      return {
        merchantKey,
        merchantName: bucket.merchantName,
        amountCents: bucket.amountCents,
        count: bucket.count,
        averageCents: meanCents(bucket.amountCents, bucket.count),
        sharePercent: percentOf(bucket.amountCents, spendingCents) ?? 0,
        primaryCategory: categories[0]?.category ?? 'Other',
        categories,
        firstSeen: bucket.firstSeen,
        lastSeen: bucket.lastSeen,
      }
    })
    .sort((left, right) => right.amountCents - left.amountCents
      || left.merchantName.localeCompare(right.merchantName))
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

function buildMonthly(
  rows: readonly ClassifiedTransaction[],
  earliest: Date | null,
  now: Date,
): MonthlyFlow[] {
  const months = new Map<string, { incomeCents: Cents; spendingCents: Cents }>()
  for (const row of rows) {
    if (!row.bookingDate) continue
    const key = monthKey(row.bookingDate)
    const bucket = months.get(key) || { incomeCents: 0, spendingCents: 0 }
    if (row.flowClass === 'INCOME') bucket.incomeCents += row.amountCents
    else if (row.flowClass === 'SPENDING') bucket.spendingCents += Math.abs(row.amountCents)
    else if (row.flowClass === 'REFUND') bucket.spendingCents -= Math.abs(row.amountCents)
    months.set(key, bucket)
  }
  const currentMonth = monthKey(now)
  const earliestMonth = earliest ? monthKey(earliest) : null
  return [...months]
    .map(([month, values]) => ({
      month,
      incomeCents: values.incomeCents,
      spendingCents: values.spendingCents,
      netCents: values.incomeCents - values.spendingCents,
      // The current month is still running, and the first month we hold data for
      // usually starts mid-month, so neither is comparable with a full one.
      partial: month === currentMonth || month === earliestMonth,
    }))
    .sort((left, right) => left.month.localeCompare(right.month))
}

function buildCurrentMonth(
  rows: readonly ClassifiedTransaction[],
  monthly: readonly MonthlyFlow[],
  now: Date,
): CurrentMonthFlow {
  const month = monthKey(now)
  const previousMonth = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)))
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  const daysElapsed = Math.min(now.getUTCDate(), daysInMonth)
  const current = monthly.find(entry => entry.month === month)
  const previous = monthly.find(entry => entry.month === previousMonth)

  let previousMonthSameDayCents = 0
  for (const row of rows) {
    if (row.flowClass !== 'SPENDING' || !row.bookingDate) continue
    if (monthKey(row.bookingDate) !== previousMonth) continue
    if (row.bookingDate.getUTCDate() > daysElapsed) continue
    previousMonthSameDayCents += Math.abs(row.amountCents)
  }

  const spendingCents = current?.spendingCents ?? 0
  return {
    month,
    incomeCents: current?.incomeCents ?? 0,
    spendingCents,
    netCents: current?.netCents ?? 0,
    daysElapsed,
    daysInMonth,
    previousMonthSpendingCents: previous?.spendingCents ?? 0,
    previousMonthSameDayCents,
    paceVsPreviousPercent: changePercent(spendingCents, previousMonthSameDayCents),
    sparkline: monthly.slice(-SPARKLINE_MONTHS),
  }
}

function buildInternalTransfers(
  matched: ReturnType<typeof matchInternalTransfers>,
  rows: readonly ClassifiedTransaction[],
  accountNames: Map<string, string>,
  currency: string,
  formatMoney: (cents: Cents) => string,
): InternalTransfersSummary {
  const ids = new Set(rows.map(row => row.id))
  const pairs = matched.pairs
    .filter(pair => pair.currency === currency && ids.has(pair.outgoingId) && ids.has(pair.incomingId))
    .map(pair => ({
      amountCents: pair.amountCents,
      date: pair.date,
      dayGap: pair.dayGap,
      fromAccountId: pair.outgoingAccountId,
      fromAccountName: accountNames.get(pair.outgoingAccountId) || 'Another account',
      toAccountId: pair.incomingAccountId,
      toAccountName: accountNames.get(pair.incomingAccountId) || 'Another account',
      confidence: pair.confidence,
      transactionIds: [pair.outgoingId, pair.incomingId] as [string, string],
    }))

  let unmatchedInCents = 0
  let unmatchedOutCents = 0
  const hints = new Set<string>()
  for (const row of rows) {
    if (row.flowClass === 'INTERNAL_UNMATCHED_IN') unmatchedInCents += Math.abs(row.amountCents)
    else if (row.flowClass === 'INTERNAL_UNMATCHED_OUT') unmatchedOutCents += Math.abs(row.amountCents)
    else continue
    if (row.counterpartyAccountHint) hints.add(`•••• ${row.counterpartyAccountHint.slice(-4)}`)
  }
  const unmatchedCount = rows.filter(row =>
    row.flowClass === 'INTERNAL_UNMATCHED_IN' || row.flowClass === 'INTERNAL_UNMATCHED_OUT').length

  return {
    matchedPairCount: pairs.length,
    matchedAmountCents: pairs.reduce((total, pair) => total + pair.amountCents, 0),
    pairs,
    unmatchedInCents,
    unmatchedOutCents,
    unmatchedCount,
    unmatchedAccountHints: [...hints].sort(),
    note: unmatchedInCents > 0
      ? `${formatMoney(unmatchedInCents)} arrived from an account you have not connected, so it is treated as moved money rather than income. Connecting that account would let both sides be matched exactly.`
      : null,
  }
}

function buildDataQuality(counts: FlowCounts, unmatchedCount: number, crossCurrency: string[]): DataQuality {
  const messages: string[] = []
  if (counts.unknownSign > 0) {
    messages.push(`${counts.unknownSign} transaction${counts.unknownSign === 1 ? '' : 's'} arrived without a direction from the bank, so ${counts.unknownSign === 1 ? 'it is' : 'they are'} counted in no total.`)
  }
  if (counts.zero > 0) {
    messages.push(`${counts.zero} zero-value entr${counts.zero === 1 ? 'y' : 'ies'} ${counts.zero === 1 ? 'is' : 'are'} listed but not counted.`)
  }
  if (unmatchedCount > 0) {
    messages.push(`${unmatchedCount} transfer${unmatchedCount === 1 ? '' : 's'} had only one visible side.`)
  }
  if (counts.pending > 0) {
    messages.push(`${counts.pending} pending transaction${counts.pending === 1 ? '' : 's'} ${counts.pending === 1 ? 'is' : 'are'} excluded until the bank books ${counts.pending === 1 ? 'it' : 'them'}.`)
  }
  if (crossCurrency.length > 1) {
    messages.push(`Transfers between accounts in different currencies (${crossCurrency.join(', ')}) cannot be matched, because the two sides differ in amount.`)
  }
  return {
    unknownSignCount: counts.unknownSign,
    zeroAmountCount: counts.zero,
    unmatchedTransferCount: unmatchedCount,
    pendingCount: counts.pending,
    messages,
  }
}

function detailRow(row: ClassifiedTransaction): AnalyticsTransaction {
  return {
    id: row.id,
    date: row.bookingDate ? isoDate(row.bookingDate) : '',
    merchantName: row.merchantName,
    merchantKey: row.merchantGroupKey,
    detail: row.detail,
    category: row.category,
    amountCents: row.amountCents,
    accountId: row.accountId,
    accountName: row.accountName,
    flowClass: row.flowClass,
  }
}

/**
 * Pair internal transfers, then label every transaction with what it is.
 *
 * Shared by analytics, the coach and the AI payload so a transfer cannot be
 * spending in one place and excluded in another.
 *
 * Pairing deliberately runs across every account the household can see, even
 * when the report is filtered to one: otherwise a single-account view calls every
 * transfer unmatched and contradicts the household totals.
 */
export function classifyTransactions(input: {
  transactions: readonly AnalyticsTransactionInput[]
  accounts?: readonly { id: string; maskedIdentifier?: string | null }[]
  visibleAccountIds?: string[] | null
}): { classified: ClassifiedTransaction[]; matched: ReturnType<typeof matchInternalTransfers> } {
  const candidates: TransferCandidate[] = input.transactions
    .filter(transaction => transaction.bookingDate && transaction.status === 'BOOKED')
    .map(transaction => ({
      id: transaction.id,
      accountId: transaction.accountId,
      currency: transaction.currency.toUpperCase(),
      amountCents: transaction.amountCents,
      bookingDate: transaction.bookingDate as Date,
      transferKind: transaction.transferKind,
      hasUserMemo: transaction.hasUserMemo,
      counterpartyAccountHint: transaction.counterpartyAccountHint,
    }))
  const matched = matchInternalTransfers(candidates, {
    accountIdentifiers: buildOwnAccountIdentifiers(input.transactions, input.accounts ?? []),
  })
  const visible = input.visibleAccountIds ? new Set(input.visibleAccountIds) : null
  return {
    matched,
    classified: input.transactions
      .filter(transaction => !visible || visible.has(transaction.accountId))
      .map(transaction => ({ ...transaction, flowClass: classifyFlow(transaction, matched.pairedIds) })),
  }
}

export function buildBankingAnalytics(input: AnalyticsInput): BankingAnalytics {
  const { periodDays, now } = input
  const range = analyticsDateRange(periodDays, now)
  const visible = input.visibleAccountIds ? new Set(input.visibleAccountIds) : null
  const { classified, matched } = classifyTransactions(input)
  const accountNames = new Map(input.accounts.map(account => [account.id, account.displayName]))

  const currencies = [...new Set(classified.map(row => row.currency.toUpperCase()))]
  const result: CurrencyAnalytics[] = []

  for (const currency of currencies) {
    const rows = classified.filter(row => row.currency.toUpperCase() === currency)
    const booked = rows.filter(row => row.status === 'BOOKED' && row.bookingDate)
    const current = booked.filter(row =>
      (row.bookingDate as Date) >= range.dateFrom && (row.bookingDate as Date) < range.currentEnd)
    const previous = booked.filter(row =>
      (row.bookingDate as Date) >= range.previousFrom && (row.bookingDate as Date) < range.dateFrom)
    if (!current.length && !previous.length) continue

    const earliest = booked.reduce<Date | null>((oldest, row) => {
      const date = row.bookingDate as Date
      return !oldest || date < oldest ? date : oldest
    }, null)
    const coverage = coverageFor(periodDays, range, earliest)

    const dailyMap = new Map<string, DailyFlow>()
    for (let day = range.dateFrom; day < range.currentEnd; day = addDays(day, 1)) {
      dailyMap.set(isoDate(day), { date: isoDate(day), incomeCents: 0, spendingCents: 0, internalCents: 0 })
    }

    const counts = emptyCounts()
    const currentTotals: Totals = { incomeCents: 0, spendingCents: 0, refundsCents: 0 }
    const categoryBuckets = new Map<FinanceCategory, CategoryBucket>()
    const merchantBuckets = new Map<string, MerchantBucket>()
    let largestExpenseCents = 0

    for (const row of rows.filter(item => item.status === 'PENDING')) counts.pending += 1

    for (const row of current) {
      counts.total += 1
      counts[COUNT_KEYS[row.flowClass]] += 1
      accumulate(currentTotals, row.flowClass, row.amountCents)

      const daily = dailyMap.get(isoDate(row.bookingDate as Date))
      if (daily) {
        if (row.flowClass === 'INCOME') daily.incomeCents += row.amountCents
        else if (row.flowClass === 'SPENDING') daily.spendingCents += Math.abs(row.amountCents)
        else if (row.flowClass === 'REFUND') daily.spendingCents -= Math.abs(row.amountCents)
        else if (row.flowClass !== 'ZERO' && row.flowClass !== 'UNKNOWN_SIGN') {
          daily.internalCents += Math.abs(row.amountCents)
        }
      }

      if (row.flowClass !== 'SPENDING') continue
      const amount = Math.abs(row.amountCents)
      largestExpenseCents = Math.max(largestExpenseCents, amount)
      const date = isoDate(row.bookingDate as Date)

      const category = categoryBuckets.get(row.category)
        || { amountCents: 0, count: 0, largestCents: 0, merchants: new Map() }
      category.amountCents += amount
      category.count += 1
      category.largestCents = Math.max(category.largestCents, amount)
      const categoryMerchant = category.merchants.get(row.merchantGroupKey)
        || { merchantName: row.merchantName, amountCents: 0, count: 0 }
      categoryMerchant.amountCents += amount
      categoryMerchant.count += 1
      category.merchants.set(row.merchantGroupKey, categoryMerchant)
      categoryBuckets.set(row.category, category)

      const merchant = merchantBuckets.get(row.merchantGroupKey) || {
        merchantName: row.merchantName,
        names: new Map<string, number>(),
        amountCents: 0,
        count: 0,
        categories: new Map(),
        firstSeen: date,
        lastSeen: date,
      }
      merchant.amountCents += amount
      merchant.count += 1
      merchant.names.set(row.merchantName, (merchant.names.get(row.merchantName) || 0) + 1)
      const merchantCategory = merchant.categories.get(row.category) || { amountCents: 0, count: 0 }
      merchantCategory.amountCents += amount
      merchantCategory.count += 1
      merchant.categories.set(row.category, merchantCategory)
      if (date < merchant.firstSeen) merchant.firstSeen = date
      if (date > merchant.lastSeen) merchant.lastSeen = date
      merchantBuckets.set(row.merchantGroupKey, merchant)
    }

    // The spelling the bank used most often, rather than whichever arrived first.
    for (const bucket of merchantBuckets.values()) {
      bucket.merchantName = [...bucket.names]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0]
        ?? bucket.merchantName
    }

    const previousTotals: Totals = { incomeCents: 0, spendingCents: 0, refundsCents: 0 }
    const previousCategories = new Map<FinanceCategory, Cents>()
    for (const row of previous) {
      accumulate(previousTotals, row.flowClass, row.amountCents)
      if (row.flowClass !== 'SPENDING') continue
      previousCategories.set(row.category, (previousCategories.get(row.category) || 0) + Math.abs(row.amountCents))
    }

    // Every booked flow in the window, so the summary reconciles with the
    // balance trend drawn beside it.
    const balanceChangeCents = current.reduce((total, row) => total + row.amountCents, 0)
    const summary = buildSummary(currentTotals, previousTotals, counts, largestExpenseCents, coverage, balanceChangeCents)
    const monthly = buildMonthly(booked, earliest, now)
    const subscriptionInput = booked.map(row => ({
      id: row.id,
      accountId: row.accountId,
      merchantName: row.merchantName,
      signedAmount: row.amountCents / 100,
      currency: row.currency,
      bookingDate: row.bookingDate,
      status: row.status,
    }))
    const formatMoney = (cents: Cents) => `${currency} ${(cents / 100).toFixed(2)}`

    result.push({
      currency,
      coverage,
      summary,
      internalTransfers: buildInternalTransfers(matched, rows, accountNames, currency, formatMoney),
      categories: buildCategories(categoryBuckets, previousCategories, currentTotals.spendingCents),
      merchants: buildMerchants(merchantBuckets, currentTotals.spendingCents),
      daily: [...dailyMap.values()],
      monthly,
      currentMonth: buildCurrentMonth(booked, monthly, now),
      balanceTrend: deriveBalanceTrend(
        input.accounts.filter(account => !visible || visible.has(account.id)),
        rows,
        currency,
        now,
        input.trendMonths,
      ),
      budgets: buildBudgetProgress(
        input.limits.filter(limit => limit.currency.toUpperCase() === currency),
        classified,
        now,
      ),
      upcomingBills: buildUpcomingBills(
        input.subscriptions,
        detectSubscriptions(subscriptionInput, now),
        currency,
        now,
        input.billHorizonDays,
      ),
      transactions: current
        .filter(row => row.flowClass === 'SPENDING' || row.flowClass === 'REFUND')
        .map(detailRow)
        .sort((left, right) => right.date.localeCompare(left.date)
          || Math.abs(right.amountCents) - Math.abs(left.amountCents)),
      dataQuality: buildDataQuality(
        counts,
        rows.filter(row => row.flowClass === 'INTERNAL_UNMATCHED_IN' || row.flowClass === 'INTERNAL_UNMATCHED_OUT').length,
        matched.crossCurrencyCurrencies,
      ),
    })
  }

  // Sorted by spending activity, and the primary currency is stated explicitly so
  // the client never has to infer it from array position.
  result.sort((left, right) => right.summary.counts.spending - left.summary.counts.spending
    || right.summary.spendingCents - left.summary.spendingCents
    || left.currency.localeCompare(right.currency))

  return {
    periodDays,
    dateFrom: isoDate(range.dateFrom),
    dateTo: isoDate(range.dateTo),
    primaryCurrency: result[0]?.currency ?? null,
    currencies: result,
  }
}
