import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import { buildRedactedFinancePayload, isDeepSeekConfigured } from '@/lib/finance/deepseek'
import { classifyTransactions } from '@/lib/finance/analytics'
import { enrichStoredTransaction, loadFinanceMetadata, toAnalyticsTransaction } from '@/lib/finance/server-metadata'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const accounts = await prisma.bankAccount.findMany({ where: accessibleBankAccountWhere(access), select: { id: true, connection: { select: { userId: true } } } })
  const requestedAccountId = typeof req.query.accountId === 'string' ? req.query.accountId : null
  const accountIds = accounts.map(account => account.id).filter(id => !requestedAccountId || id === requestedAccountId)
  if (requestedAccountId && !accountIds.length) return res.status(404).json({ error: 'Bank account not found' })
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 90)
  const transactions = accountIds.length ? await prisma.bankTransaction.findMany({ where: { accountId: { in: accountIds }, status: 'BOOKED', bookingDate: { gte: from } } }) : []
  const metadata = await loadFinanceMetadata(accountIds, [...new Set(accounts.map(account => account.connection.userId))], transactions.map(transaction => transaction.id))
  // Classified, so internal transfers are not described to the model as spending.
  const { classified } = classifyTransactions({
    transactions: transactions.map(transaction => ({
      ...toAnalyticsTransaction(transaction, enrichStoredTransaction(transaction, metadata)),
      accountName: null,
    })),
  })
  const enriched = classified.map(transaction => ({
    id: transaction.id,
    accountId: transaction.accountId,
    merchantName: transaction.merchantName,
    category: transaction.category,
    signedAmount: transaction.amountCents / 100,
    currency: transaction.currency,
    bookingDate: transaction.bookingDate,
    status: transaction.status,
    flowClass: transaction.flowClass,
  }))
  const [preference] = await Promise.all([prisma.financeAiPreference.findUnique({ where: { userId: access.userId } })])
  return res.status(200).json({
    configured: isDeepSeekConfigured(),
    consented: Boolean(preference?.consentedAt && !preference.revokedAt),
    accountIds,
    payload: buildRedactedFinancePayload(enriched),
  })
}

export default withApiHandler(handler)
