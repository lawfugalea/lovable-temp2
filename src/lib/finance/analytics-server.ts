/**
 * Load everything `buildBankingAnalytics` needs out of Postgres.
 *
 * This is the only place a `Decimal` becomes cents, which is what keeps the
 * engine pure and the rounding to exactly one place in the whole pipeline.
 */
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, type FinanceAccess } from './access'
import type {
  AnalyticsAccountInput,
  AnalyticsInput,
  AnalyticsLimitInput,
  AnalyticsSubscriptionInput,
  AnalyticsTransactionInput,
} from './analytics-types'
import { analyticsDateRange } from './analytics'
import { isAvailableBalanceType, isBookedBalanceType } from './normalization'
import { toCents, toCentsOrNull } from './money'
import { enrichStoredTransaction, loadFinanceMetadata, toAnalyticsTransaction } from './server-metadata'

const DEFAULT_TREND_MONTHS = 6
/** Enough history for `detectSubscriptions` to see three cycles of a quarterly bill. */
const SUBSCRIPTION_LOOKBACK_DAYS = 200

export type LoadAnalyticsParams = {
  access: FinanceAccess
  periodDays: number
  accountId?: string | null
  trendMonths?: number
  now: Date
}

export type LoadAnalyticsResult =
  | { ok: true; input: AnalyticsInput; accountIds: string[] }
  | { ok: false; error: 'ACCOUNT_NOT_FOUND' }

function pickBalance(balances: Array<{ balanceType: string; currency: string; amount: { toString(): string }; updatedAt: Date; referenceDate: Date | null }>) {
  const preferred = balances.find(balance => isAvailableBalanceType(balance.balanceType))
    || balances.find(balance => isBookedBalanceType(balance.balanceType))
    || balances[0]
  if (!preferred) return { balanceCents: null, balanceType: null, balanceAsOf: null }
  return {
    balanceCents: toCentsOrNull(preferred.amount.toString()),
    balanceType: preferred.balanceType,
    balanceAsOf: preferred.referenceDate ?? preferred.updatedAt,
  }
}

export async function loadAnalyticsInput(params: LoadAnalyticsParams): Promise<LoadAnalyticsResult> {
  const { access, periodDays, now } = params
  const accountWhere = accessibleBankAccountWhere(access)

  // Resolve ids first so the transaction query can filter on `accountId` directly
  // and use @@index([accountId, bookingDate]) rather than joining through
  // BankAccount and BankAccountShare.
  const accounts = await prisma.bankAccount.findMany({
    where: accountWhere,
    select: {
      id: true,
      displayName: true,
      customName: true,
      maskedIdentifier: true,
      currency: true,
      connection: { select: { userId: true } },
      balances: {
        select: { balanceType: true, currency: true, amount: true, updatedAt: true, referenceDate: true },
      },
    },
  })
  if (params.accountId && !accounts.some(account => account.id === params.accountId)) {
    return { ok: false, error: 'ACCOUNT_NOT_FOUND' }
  }

  const accountIds = accounts.map(account => account.id)
  const range = analyticsDateRange(periodDays, now)
  const trendMonths = params.trendMonths ?? DEFAULT_TREND_MONTHS
  const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (trendMonths - 1), 1))
  const subscriptionStart = new Date(now.getTime() - SUBSCRIPTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const loadFrom = new Date(Math.min(range.previousFrom.getTime(), trendStart.getTime(), subscriptionStart.getTime()))

  const rows = accountIds.length
    ? await prisma.bankTransaction.findMany({
      where: { accountId: { in: accountIds }, bookingDate: { gte: loadFrom } },
      select: {
        id: true,
        accountId: true,
        amount: true,
        currency: true,
        status: true,
        bookingDate: true,
        valueDate: true,
        counterparty: true,
        description: true,
        providerData: true,
      },
      orderBy: { bookingDate: 'asc' },
    })
    : []

  const ownerIds = [...new Set(accounts.map(account => account.connection.userId))]
  const metadata = await loadFinanceMetadata(accountIds, ownerIds, rows.map(row => row.id))
  const accountNames = new Map(accounts.map(account => [account.id, account.customName || account.displayName]))

  const transactions: AnalyticsTransactionInput[] = rows.map(row => ({
    // User rules and per-transaction corrections still win over the local
    // heuristics — that is the household's escape hatch when a regex guesses wrong.
    ...toAnalyticsTransaction(row, enrichStoredTransaction(row, metadata)),
    accountName: accountNames.get(row.accountId) ?? null,
  }))

  const [limitRows, subscriptionRows] = accountIds.length
    ? await Promise.all([
      prisma.financeLimit.findMany({
        where: { enabled: true, userId: { in: ownerIds } },
        select: { id: true, accountId: true, scope: true, scopeKey: true, displayName: true, amount: true, currency: true, enabled: true },
      }),
      prisma.financeSubscription.findMany({
        where: { accountId: { in: accountIds } },
        select: { id: true, accountId: true, merchantKey: true, displayName: true, cadence: true, expectedAmount: true, currency: true, nextExpectedDate: true, reminderDays: true, status: true },
      }),
    ])
    : [[], []]

  const limits: AnalyticsLimitInput[] = limitRows.map(limit => ({
    id: limit.id,
    accountId: limit.accountId,
    scope: limit.scope,
    scopeKey: limit.scopeKey,
    displayName: limit.displayName,
    amountCents: toCents(limit.amount.toString()),
    currency: limit.currency,
    enabled: limit.enabled,
  }))

  const subscriptions: AnalyticsSubscriptionInput[] = subscriptionRows.map(subscription => ({
    id: subscription.id,
    accountId: subscription.accountId,
    merchantKey: subscription.merchantKey,
    displayName: subscription.displayName,
    cadence: subscription.cadence,
    expectedAmountCents: toCentsOrNull(subscription.expectedAmount?.toString()) ?? 0,
    currency: subscription.currency,
    nextExpectedDate: subscription.nextExpectedDate,
    reminderDays: subscription.reminderDays,
    status: subscription.status,
  }))

  const analyticsAccounts: AnalyticsAccountInput[] = accounts.map(account => ({
    id: account.id,
    displayName: account.customName || account.displayName,
    currency: account.currency,
    maskedIdentifier: account.maskedIdentifier,
    ...pickBalance(account.balances),
  }))

  return {
    ok: true,
    accountIds,
    input: {
      transactions,
      accounts: analyticsAccounts,
      limits,
      subscriptions,
      periodDays,
      now,
      // Filtering narrows what is *reported*; pairing still sees every account, so
      // a single-account view cannot contradict the household totals.
      visibleAccountIds: params.accountId ? [params.accountId] : null,
      trendMonths,
    },
  }
}
