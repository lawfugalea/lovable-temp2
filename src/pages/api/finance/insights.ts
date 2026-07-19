import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import { buildFinanceInsights, insightDateRange } from '@/lib/finance/insights'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'

const ALLOWED_PERIODS = new Set([30, 90, 180, 365])

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return

  const requestedPeriod = Number(req.query.days || 90)
  if (!ALLOWED_PERIODS.has(requestedPeriod)) {
    return res.status(400).json({ error: 'days must be one of 30, 90, 180, or 365' })
  }
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : null
  const accountWhere = accessibleBankAccountWhere(access)
  if (accountId) {
    const allowed = await prisma.bankAccount.findFirst({
      where: { id: accountId, ...accountWhere },
      select: { id: true },
    })
    if (!allowed) return res.status(404).json({ error: 'Bank account not found' })
  }

  const now = new Date()
  const range = insightDateRange(requestedPeriod, now)
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      account: accountWhere,
      ...(accountId ? { accountId } : {}),
      status: 'BOOKED',
      bookingDate: { gte: range.previousFrom },
    },
    select: {
      id: true,
      accountId: true,
      amount: true,
      currency: true,
      bookingDate: true,
      counterparty: true,
      description: true,
      providerData: true,
      account: { select: { displayName: true, customName: true, connection: { select: { userId: true } } } },
    },
    orderBy: { bookingDate: 'asc' },
  })

  const metadata = await loadFinanceMetadata(
    [...new Set(transactions.map(transaction => transaction.accountId))],
    [...new Set(transactions.map(transaction => transaction.account.connection.userId))],
    transactions.map(transaction => transaction.id),
  )

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json(buildFinanceInsights(
    transactions.map(transaction => ({
      ...transaction,
      amount: transaction.amount.toString(),
      accountName: transaction.account.customName || transaction.account.displayName,
      enriched: enrichStoredTransaction(transaction, metadata),
    })),
    requestedPeriod,
    now,
  ))
}

export default withApiHandler(handler)
