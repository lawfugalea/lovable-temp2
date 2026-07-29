/**
 * The banking analytics contract, shared by the pure engine, the API routes and
 * the client.
 *
 * Every monetary field is an integer number of cents and named `*Cents`. Rounding
 * happens once, when a Postgres `Decimal` is read, and never again — which is why
 * a category total, its merchant rows and the transactions beneath it now add up.
 */
import type { AmountSource, FinanceCategory, TransferKind } from './enrichment'
import type { FlowClass } from './classification'
import type { Cents } from './money'
import type { TransferPairConfidence } from './transfers'

export type AnalyticsTransactionInput = {
  id: string
  accountId: string
  accountName: string | null
  currency: string
  amountCents: Cents
  amountSource: AmountSource
  bookingDate: Date | null
  valueDate: Date | null
  status: 'BOOKED' | 'PENDING'
  merchantName: string
  merchantGroupKey: string
  detail: string | null
  category: FinanceCategory
  transactionType: string
  transferKind: TransferKind
  hasUserMemo: boolean
  counterpartyAccountHint: string | null
  ownAccountIdentifiers: string[]
}

export type AnalyticsAccountInput = {
  id: string
  displayName: string
  currency: string
  maskedIdentifier: string | null
  balanceCents: Cents | null
  balanceType: string | null
  balanceAsOf: Date | null
}

export type AnalyticsLimitInput = {
  id: string
  accountId: string | null
  scope: 'CATEGORY' | 'MERCHANT' | string
  scopeKey: string
  displayName: string
  amountCents: Cents
  currency: string
  enabled: boolean
}

export type AnalyticsSubscriptionInput = {
  id: string
  accountId: string
  merchantKey: string
  displayName: string
  cadence: string
  expectedAmountCents: Cents
  currency: string
  nextExpectedDate: Date | string | null
  reminderDays: number
  status: 'CANDIDATE' | 'CONFIRMED' | 'DISMISSED' | string
}

export type AnalyticsInput = {
  transactions: AnalyticsTransactionInput[]
  accounts: AnalyticsAccountInput[]
  limits: AnalyticsLimitInput[]
  subscriptions: AnalyticsSubscriptionInput[]
  periodDays: number
  now: Date
  /** Restrict what is *reported*. Pairing always considers every transaction. */
  visibleAccountIds?: string[] | null
  trendMonths?: number
  billHorizonDays?: number
}

/** How much of the requested period the bank actually gave us data for. */
export type CoverageInfo = {
  periodDays: number
  coveredDays: number
  dataStartDate: string | null
  dateFrom: string
  dateTo: string
  complete: boolean
  /**
   * Whether the period *before* this one is also covered.
   *
   * Separate from `complete` because they fail independently and mean different
   * things: with 90 days of history a 90-day view is complete, while the 90 days
   * it would be compared against contain nothing at all. Every category then
   * reads as "New" and the two with a stray earlier transaction read as +1745%.
   * Comparisons must be withheld, not computed, when this is false.
   */
  previousCovered: boolean
}

export type FlowCounts = {
  total: number
  spending: number
  income: number
  refund: number
  internalMatched: number
  internalUnmatchedIn: number
  internalUnmatchedOut: number
  zero: number
  unknownSign: number
  pending: number
}

export type MoneyFlowComparison = {
  previousIncomeCents: Cents
  previousSpendingCents: Cents
  previousNetCents: Cents
  spendingChangePercent: number | null
  incomeChangePercent: number | null
  /**
   * A signed delta rather than a percentage: net position crosses zero, and a
   * percentage change across zero says nothing at all.
   */
  netChangeCents: Cents
  netDirection: 'UP' | 'DOWN' | 'FLAT'
}

export type MoneyFlowSummary = {
  incomeCents: Cents
  /** Gross consumption, including bills and cash withdrawals. */
  spendingCents: Cents
  refundsCents: Cents
  /** Spending less refunds: what the household actually parted with. */
  netSpendingCents: Cents
  /** Earned income less net spending: the "how are we doing" figure. */
  netCents: Cents
  /**
   * Everything that touched the visible balance, moved money included.
   *
   * Kept alongside `netCents` because the two answer different questions and a
   * page showing both a net figure and a balance line has to reconcile:
   * `netCents + unmatchedInCents - unmatchedOutCents === balanceChangeCents`.
   */
  balanceChangeCents: Cents
  savingsRatePercent: number | null
  largestExpenseCents: Cents
  averageSpendPerTransactionCents: Cents
  /** Divided by days with data, not by the nominal period length. */
  averageSpendPerDayCents: Cents
  averageSpendPerMonthCents: Cents
  counts: FlowCounts
  comparison: MoneyFlowComparison
}

export type InternalTransferPair = {
  amountCents: Cents
  date: string
  dayGap: number
  fromAccountId: string
  fromAccountName: string
  toAccountId: string
  toAccountName: string
  confidence: TransferPairConfidence
  transactionIds: [string, string]
}

export type InternalTransfersSummary = {
  matchedPairCount: number
  /** Absolute amount per pair, counted once. */
  matchedAmountCents: Cents
  pairs: InternalTransferPair[]
  unmatchedInCents: Cents
  unmatchedOutCents: Cents
  unmatchedCount: number
  unmatchedAccountHints: string[]
  note: string | null
}

export type CategoryMerchantStat = {
  merchantKey: string
  merchantName: string
  amountCents: Cents
  count: number
  /** Share of this category, computed server-side so no client divides. */
  sharePercent: number
}

export type CategoryStat = {
  category: FinanceCategory
  amountCents: Cents
  previousAmountCents: Cents
  changeCents: Cents
  changePercent: number | null
  count: number
  sharePercent: number
  averageCents: Cents
  largestCents: Cents
  merchantCount: number
  merchants: CategoryMerchantStat[]
}

export type MerchantCategoryStat = {
  category: FinanceCategory
  amountCents: Cents
  count: number
}

export type MerchantStat = {
  merchantKey: string
  merchantName: string
  amountCents: Cents
  count: number
  averageCents: Cents
  sharePercent: number
  primaryCategory: FinanceCategory
  /** A merchant can span categories; pretending otherwise produced 240% shares. */
  categories: MerchantCategoryStat[]
  firstSeen: string
  lastSeen: string
}

export type DailyFlow = {
  date: string
  incomeCents: Cents
  spendingCents: Cents
  internalCents: Cents
}

export type MonthlyFlow = {
  month: string
  incomeCents: Cents
  spendingCents: Cents
  netCents: Cents
  /** The month is only partly inside the data, so it is not comparable. */
  partial: boolean
}

export type CurrentMonthFlow = {
  month: string
  incomeCents: Cents
  spendingCents: Cents
  netCents: Cents
  daysElapsed: number
  daysInMonth: number
  previousMonthSpendingCents: Cents
  /** Same day of the previous month, so day 5 compares with day 5. */
  previousMonthSameDayCents: Cents
  paceVsPreviousPercent: number | null
  sparkline: MonthlyFlow[]
}

export type BalanceTrendPoint = {
  date: string
  balanceCents: Cents
  /** Worked backwards from today's balance rather than observed. */
  derived: boolean
}

export type BalanceTrend = {
  points: BalanceTrendPoint[]
  reliable: boolean
  caveat: string | null
}

export type BudgetProgress = {
  id: string
  accountId: string | null
  scope: string
  scopeKey: string
  displayName: string
  limitCents: Cents
  spentCents: Cents
  percentage: number
  projectedCents: Cents | null
  projectionBasis: 'ELAPSED_DAYS' | 'INSUFFICIENT_DATA'
  exceeded: boolean
  currency: string
}

export type UpcomingBill = {
  id: string
  merchantName: string
  merchantKey: string
  accountId: string
  amountCents: Cents
  dueDate: string
  daysUntilDue: number
  cadence: string
  state: 'UPCOMING' | 'DUE' | 'OVERDUE'
  source: 'CONFIRMED' | 'DETECTED'
  confidence: number | null
}

export type AnalyticsTransaction = {
  id: string
  date: string
  merchantName: string
  merchantKey: string
  detail: string | null
  category: FinanceCategory
  amountCents: Cents
  accountId: string
  accountName: string | null
  flowClass: FlowClass
}

export type DataQuality = {
  unknownSignCount: number
  zeroAmountCount: number
  unmatchedTransferCount: number
  pendingCount: number
  messages: string[]
}

export type CurrencyAnalytics = {
  currency: string
  coverage: CoverageInfo
  summary: MoneyFlowSummary
  internalTransfers: InternalTransfersSummary
  categories: CategoryStat[]
  merchants: MerchantStat[]
  daily: DailyFlow[]
  monthly: MonthlyFlow[]
  currentMonth: CurrentMonthFlow
  balanceTrend: BalanceTrend | null
  budgets: BudgetProgress[]
  upcomingBills: UpcomingBill[]
  transactions: AnalyticsTransaction[]
  dataQuality: DataQuality
}

export type BankingAnalytics = {
  periodDays: number
  dateFrom: string
  dateTo: string
  primaryCurrency: string | null
  currencies: CurrencyAnalytics[]
}
