import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  EnableBankingError,
  getProviderAccountDetails,
  getProviderBalances,
  getProviderSession,
  getProviderTransactions,
} from './enable-banking'
import { normalizeBalances, normalizeBankAccount, normalizeTransaction } from './normalization'

const INITIAL_HISTORY_DAYS = 90
const OVERLAP_DAYS = 7

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function historyStart(latest: Date | null): string {
  const start = latest ? new Date(latest) : new Date()
  start.setUTCDate(start.getUTCDate() - (latest ? OVERLAP_DAYS : INITIAL_HISTORY_DAYS))
  return dateOnly(start)
}

function consentExpiry(session: Record<string, unknown>): Date | null {
  const access = session.access && typeof session.access === 'object'
    ? session.access as Record<string, unknown>
    : {}
  const value = typeof access.valid_until === 'string' ? new Date(access.valid_until) : null
  return value && !Number.isNaN(value.getTime()) ? value : null
}

export function isReauthorizationError(error: unknown): boolean {
  if (!(error instanceof EnableBankingError)) return false
  const code = error.code?.toUpperCase() || ''
  return error.status === 401 || code.includes('SESSION') || code.includes('CONSENT') || code.includes('REVOK')
}

export function publicSyncError(error: unknown): string {
  if (error instanceof EnableBankingError) return error.message.slice(0, 500)
  return 'Bank sync failed unexpectedly'
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
    const [detailsPayload, balancesPayload] = await Promise.all([
      getProviderAccountDetails(account.providerAccountId),
      getProviderBalances(account.providerAccountId),
    ])
    const normalizedAccount = normalizeBankAccount(detailsPayload, {
      providerAccountId: account.providerAccountId,
      identificationHash: account.identificationHash,
      displayName: account.displayName,
      maskedIdentifier: account.maskedIdentifier,
      currency: account.currency,
      cashAccountType: account.cashAccountType,
    })
    const balances = normalizeBalances(balancesPayload)
    const latest = await prisma.bankTransaction.findFirst({
      where: { accountId: account.id, status: 'BOOKED', bookingDate: { not: null } },
      orderBy: { bookingDate: 'desc' },
      select: { bookingDate: true },
    })
    const dateFrom = historyStart(latest?.bookingDate || null)
    const [bookedRaw, pendingRaw] = await Promise.all([
      getProviderTransactions({ accountId: account.providerAccountId, dateFrom, transactionStatus: 'BOOK' }),
      getProviderTransactions({ accountId: account.providerAccountId, dateFrom, transactionStatus: 'PDNG' }),
    ])
    const booked = bookedRaw.map(item => normalizeTransaction(item, 'BOOKED')).filter(Boolean)
    const pending = pendingRaw.map(item => normalizeTransaction(item, 'PENDING')).filter(Boolean)

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

      await tx.bankBalance.deleteMany({ where: { accountId: account.id } })
      if (balances.length) {
        await tx.bankBalance.createMany({
          data: balances.map(balance => ({ accountId: account.id, ...balance })),
        })
      }

      await tx.bankTransaction.deleteMany({ where: { accountId: account.id, status: 'PENDING' } })
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
        await tx.bankTransaction.upsert({
          where: {
            accountId_deduplicationKey: {
              accountId: account.id,
              deduplicationKey: transaction.deduplicationKey,
            },
          },
          create: { accountId: account.id, deduplicationKey: transaction.deduplicationKey, ...data },
          update: data,
        })
      }
    })
  }

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: {
      status: 'ACTIVE',
      consentExpiresAt: consentExpiry(session),
      lastSyncedAt: new Date(),
      syncError: null,
    },
  })
}
