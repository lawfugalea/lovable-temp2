import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  EnableBankingError,
  getProviderAccountDetails,
  getProviderBalances,
  getProviderSession,
  getProviderTransactions,
  isRateLimitError,
  isReauthorizationError,
  publicSyncError,
  sessionConsentExpiry,
} from './enable-banking'
import { normalizeBalances, normalizeBankAccount, normalizeTransaction } from './normalization'

// The sync error classifiers live with the provider client so that callers can
// import them without pulling in Prisma.
export { isRateLimitError, isReauthorizationError, publicSyncError } from './enable-banking'

/**
 * What to ask for on a first sync. A bank returns what it holds and no more —
 * BOV was measured to cap at about 90 days even when asked for 730 — but other
 * ASPSPs give a year or two inside a freshly authorised consent, so ask widely
 * and take what arrives. `scripts/backfill-finance-history.ts` reports what a
 * given bank actually returns.
 */
const INITIAL_HISTORY_DAYS = 365
const OVERLAP_DAYS = 7

/** How long a held sync lock is treated as abandoned rather than running. */
const STALE_LOCK_MINUTES = 5

export type LockedSyncResult =
  | { ok: true }
  | { ok: false; reason: 'busy' }
  | { ok: false; reason: 'failed'; message: string; rateLimited: boolean; reauth: boolean }

export type LockedSyncOptions = {
  /**
   * Refuse the lock unless the connection is still ACTIVE. The worker wants this
   * so a connection that broke since it was picked as due is skipped rather than
   * retried. A person pressing Refresh does not: they should get the real error
   * back, not silence.
   */
  requireActive?: boolean
}

/**
 * Sync one connection while holding the `syncStartedAt` lock, persisting the
 * outcome exactly as the worker and the manual refresh do.
 *
 * This exists so a caller can run a sync *without* a request waiting on it. The
 * first sync of a new connection asks for a year of history across every
 * account, which takes far longer than a browser — or a reverse proxy — will
 * hold a redirect open, so the OAuth callback starts it detached instead.
 */
export async function runLockedSync(
  connectionId: string,
  options: LockedSyncOptions = {},
): Promise<LockedSyncResult> {
  const now = new Date()
  const staleLock = new Date(now.getTime() - STALE_LOCK_MINUTES * 60_000)
  const locked = await prisma.bankConnection.updateMany({
    where: {
      id: connectionId,
      ...(options.requireActive ? { status: 'ACTIVE' as const } : {}),
      OR: [{ syncStartedAt: null }, { syncStartedAt: { lt: staleLock } }],
    },
    data: { syncStartedAt: now, lastSyncAttemptAt: now },
  })
  if (locked.count !== 1) return { ok: false, reason: 'busy' }

  try {
    await syncBankConnection(connectionId)
    return { ok: true }
  } catch (error) {
    const rateLimited = isRateLimitError(error)
    const reauth = isReauthorizationError(error)
    const message = publicSyncError(error)
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        // A daily access cap leaves the consent intact, so keep the connection
        // as it was and only surface the note.
        ...(rateLimited ? {} : { status: reauth ? 'REAUTH_REQUIRED' : 'ERROR' }),
        syncError: message,
      },
    }).catch(() => undefined)
    return { ok: false, reason: 'failed', message, rateLimited, reauth }
  } finally {
    await prisma.bankConnection.updateMany({
      where: { id: connectionId },
      data: { syncStartedAt: null },
    }).catch(() => undefined)
  }
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function historyStart(latest: Date | null): string {
  const start = latest ? new Date(latest) : new Date()
  start.setUTCDate(start.getUTCDate() - (latest ? OVERLAP_DAYS : INITIAL_HISTORY_DAYS))
  return dateOnly(start)
}

/**
 * Find the row a reference-less transaction was previously stored under and move
 * it onto the new provider-only key, so the identity change does not insert a
 * duplicate.
 *
 * Old keys hashed enrichment output, which we can no longer reproduce, so the
 * lookup uses the provider-stable fields instead. That is exactly as precise as
 * the old hash: two rows agreeing on all of them would have hashed identically
 * and so were already stored as one row.
 */
async function rekeyedDeduplicationKey(
  tx: Prisma.TransactionClient,
  accountId: string,
  transaction: { deduplicationKey: string; status: string; amount: string; currency: string; bookingDate: Date | null; valueDate: Date | null },
): Promise<string> {
  const existing = await tx.bankTransaction.findFirst({
    where: {
      accountId,
      status: transaction.status as 'BOOKED' | 'PENDING',
      amount: transaction.amount,
      currency: transaction.currency,
      bookingDate: transaction.bookingDate,
      valueDate: transaction.valueDate,
      deduplicationKey: { startsWith: 'hash:' },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (existing) {
    await tx.bankTransaction.update({
      where: { id: existing.id },
      data: { deduplicationKey: transaction.deduplicationKey },
    })
  }
  return transaction.deduplicationKey
}

export async function syncBankConnection(connectionId: string): Promise<void> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    include: { accounts: true },
  })
  if (!connection?.providerSessionId) {
    throw new EnableBankingError('Bank connection has not been authorized', 409, 'SESSION_MISSING')
  }

  const session = await getProviderSession(connection.providerSessionId)
  const sessionStatus = typeof session.status === 'string' ? session.status.toUpperCase() : 'AUTHORIZED'
  if (sessionStatus !== 'AUTHORIZED') {
    throw new EnableBankingError('Bank consent is no longer active', 401, `SESSION_${sessionStatus}`)
  }

  for (const account of connection.accounts) {
    // Every provider call counts against the bank's daily access budget, so the
    // account details are only re-read while metadata is still missing — they
    // never change once we have them.
    const needsDetails = !account.maskedIdentifier || !account.cashAccountType
    const detailsPayload = needsDetails
      ? await getProviderAccountDetails(account.providerAccountId)
      : null
    const balancesPayload = await getProviderBalances(account.providerAccountId)
    const normalizedAccount = detailsPayload
      ? normalizeBankAccount(detailsPayload, {
        providerAccountId: account.providerAccountId,
        identificationHash: account.identificationHash,
        displayName: account.displayName,
        maskedIdentifier: account.maskedIdentifier,
        currency: account.currency,
        cashAccountType: account.cashAccountType,
      })
      : null
    const balances = normalizeBalances(balancesPayload)
    const latest = await prisma.bankTransaction.findFirst({
      where: { accountId: account.id, status: 'BOOKED', bookingDate: { not: null } },
      orderBy: { bookingDate: 'desc' },
      select: { bookingDate: true },
    })
    const dateFrom = historyStart(latest?.bookingDate || null)
    const bookedRaw = await getProviderTransactions({
      accountId: account.providerAccountId,
      dateFrom,
      transactionStatus: 'BOOK',
    })
    // Pending transactions are a nice-to-have: if the booked history used up the
    // daily access budget, keep what we just fetched instead of failing the run.
    let pendingRaw: Record<string, unknown>[] | null = null
    try {
      pendingRaw = await getProviderTransactions({
        accountId: account.providerAccountId,
        dateFrom,
        transactionStatus: 'PDNG',
      })
    } catch (error) {
      if (!isRateLimitError(error)) throw error
      console.warn('Skipped pending transactions, bank daily access budget reached:', account.id)
    }
    const booked = bookedRaw.map(item => normalizeTransaction(item, 'BOOKED')).filter(Boolean)
    const pending = (pendingRaw || []).map(item => normalizeTransaction(item, 'PENDING')).filter(Boolean)

    await prisma.$transaction(async tx => {
      if (normalizedAccount) {
        await tx.bankAccount.update({
          where: { id: account.id },
          data: {
            displayName: normalizedAccount.displayName,
            maskedIdentifier: normalizedAccount.maskedIdentifier,
            currency: normalizedAccount.currency,
            cashAccountType: normalizedAccount.cashAccountType,
          },
        })
      }

      // Upsert rather than delete-and-recreate: the row's `updatedAt` is the only
      // "as of" timestamp we have for a balance, and recreating it every sync
      // threw that away along with the row id.
      const keptBalanceTypes: string[] = []
      for (const balance of balances) {
        keptBalanceTypes.push(`${balance.balanceType}|${balance.currency}`)
        await tx.bankBalance.upsert({
          where: {
            accountId_balanceType_currency: {
              accountId: account.id,
              balanceType: balance.balanceType,
              currency: balance.currency,
            },
          },
          create: { accountId: account.id, ...balance },
          update: balance,
        })
      }
      const staleBalances = await tx.bankBalance.findMany({
        where: { accountId: account.id },
        select: { id: true, balanceType: true, currency: true },
      })
      const staleIds = staleBalances
        .filter(row => !keptBalanceTypes.includes(`${row.balanceType}|${row.currency}`))
        .map(row => row.id)
      if (staleIds.length) await tx.bankBalance.deleteMany({ where: { id: { in: staleIds } } })

      if (pendingRaw) {
        await tx.bankTransaction.deleteMany({ where: { accountId: account.id, status: 'PENDING' } })
      }
      for (const transaction of [...booked, ...pending]) {
        if (!transaction) continue
        const data = {
          providerTransactionId: transaction.providerTransactionId,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          bookingDate: transaction.bookingDate,
          valueDate: transaction.valueDate,
          counterparty: transaction.counterparty,
          description: transaction.description,
          providerData: transaction.providerData as Prisma.InputJsonValue,
        }
        const deduplicationKey = transaction.providerTransactionId
          ? transaction.deduplicationKey
          : await rekeyedDeduplicationKey(tx, account.id, transaction)
        await tx.bankTransaction.upsert({
          where: {
            accountId_deduplicationKey: { accountId: account.id, deduplicationKey },
          },
          create: { accountId: account.id, deduplicationKey, ...data },
          update: data,
        })
      }
    })
  }

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: {
      status: 'ACTIVE',
      consentExpiresAt: sessionConsentExpiry(session),
      lastSyncedAt: new Date(),
      syncError: null,
    },
  })
}
