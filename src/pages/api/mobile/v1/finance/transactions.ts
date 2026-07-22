import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileFinanceTransactionsResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { accessibleBankAccountWhere } from '@/lib/finance/access'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileFinanceTransactionsResponse | MobileApiError>) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).json({ error: 'Method not allowed' }) }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null
  const accountWhere = accessibleBankAccountWhere(access)
  const page = await prisma.bankTransaction.findMany({
    where: { account: accountWhere },
    include: { account: { select: { id: true, displayName: true, customName: true, maskedIdentifier: true, connection: { select: { userId: true } } } } },
    orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }], take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
  const hasMore = page.length > 50
  const items = hasMore ? page.slice(0, 50) : page
  const metadata = await loadFinanceMetadata([...new Set(items.map(transaction => transaction.accountId))], [...new Set(items.map(transaction => transaction.account.connection.userId))], items.map(transaction => transaction.id))
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ transactions: items.map(transaction => {
    const enriched = enrichStoredTransaction(transaction, metadata)
    return { id: transaction.id, account: { id: transaction.account.id, displayName: transaction.account.customName || transaction.account.displayName, maskedIdentifier: transaction.account.maskedIdentifier }, amount: String(enriched.signedAmount), currency: transaction.currency, status: transaction.status, bookingDate: transaction.bookingDate?.toISOString() || null, valueDate: transaction.valueDate?.toISOString() || null, counterparty: transaction.counterparty, description: transaction.description, merchantName: enriched.merchantName, detail: enriched.detail, category: enriched.category, signedAmount: enriched.signedAmount }
  }), nextCursor: hasMore ? items.at(-1)?.id || null : null })
}

export default withApiHandler(handler)
