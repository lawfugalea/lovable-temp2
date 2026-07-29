import { prisma } from '@/lib/prisma'
import type { AnalyticsTransactionInput } from './analytics-types'
import { enrichWithFinanceMetadata, type FinanceMetadata } from './metadata'

export type StoredFinanceTransaction = {
  id: string
  accountId: string
  amount: { toString(): string } | string | number
  counterparty: string | null
  description: string | null
  providerData: unknown
}

export async function loadFinanceMetadata(accountIds: string[], ownerIds: string[], transactionIds: string[] = []) {
  const [rules, overrides] = await Promise.all([
    accountIds.length && ownerIds.length
      ? prisma.financePatternRule.findMany({
          where: {
            userId: { in: ownerIds },
            enabled: true,
            OR: [{ accountId: null }, { accountId: { in: accountIds } }],
          },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
    transactionIds.length
      ? prisma.financeTransactionOverride.findMany({ where: { transactionId: { in: transactionIds } } })
      : Promise.resolve([]),
  ])
  return { rules, overrides }
}

export function enrichStoredTransaction(
  transaction: StoredFinanceTransaction,
  metadata: Awaited<ReturnType<typeof loadFinanceMetadata>>,
): FinanceMetadata {
  return enrichWithFinanceMetadata({
    id: transaction.id,
    accountId: transaction.accountId,
    amount: transaction.amount.toString(),
    counterparty: transaction.counterparty,
    description: transaction.description,
    providerData: transaction.providerData,
  }, metadata.rules, metadata.overrides)
}

/**
 * Shape a stored row plus its enrichment as an analytics transaction, so routes
 * that only need classification do not have to restate the mapping.
 */
export function toAnalyticsTransaction(
  row: StoredFinanceTransaction & {
    currency: string
    status: 'BOOKED' | 'PENDING'
    bookingDate: Date | null
    valueDate?: Date | null
  },
  enriched: FinanceMetadata,
): AnalyticsTransactionInput {
  return {
    id: row.id,
    accountId: row.accountId,
    accountName: null,
    currency: row.currency,
    amountCents: enriched.amountCents,
    amountSource: enriched.amountSource,
    bookingDate: row.bookingDate,
    valueDate: row.valueDate ?? null,
    status: row.status,
    merchantName: enriched.merchantName,
    merchantGroupKey: enriched.merchantGroupKey,
    detail: enriched.detail,
    category: enriched.category,
    transactionType: enriched.transactionType,
    transferKind: enriched.transferKind,
    hasUserMemo: enriched.hasUserMemo,
    counterpartyAccountHint: enriched.counterpartyAccountHint,
    ownAccountIdentifiers: enriched.ownAccountIdentifiers,
  }
}
