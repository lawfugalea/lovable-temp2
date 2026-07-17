import { prisma } from '@/lib/prisma'
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
