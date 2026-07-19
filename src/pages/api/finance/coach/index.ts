import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import { buildCoachSignals, buildLimitProgress } from '@/lib/finance/coach'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const accounts = await prisma.bankAccount.findMany({
    where: accessibleBankAccountWhere(access),
    select: { id: true, connection: { select: { userId: true } } },
  })
  const requestedAccountId = typeof req.query.accountId === 'string' ? req.query.accountId : null
  const accountIds = accounts.map(account => account.id).filter(id => !requestedAccountId || requestedAccountId === id)
  if (requestedAccountId && !accountIds.length) return res.status(404).json({ error: 'Bank account not found' })
  const ownerIds = [...new Set(accounts.filter(account => accountIds.includes(account.id)).map(account => account.connection.userId))]
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 65)
  const [transactions, subscriptions, limits, feedback] = await Promise.all([
    accountIds.length ? prisma.bankTransaction.findMany({
      where: { accountId: { in: accountIds }, status: 'BOOKED', bookingDate: { gte: from } },
      orderBy: { bookingDate: 'asc' },
    }) : Promise.resolve([]),
    accountIds.length ? prisma.financeSubscription.findMany({
      where: { accountId: { in: accountIds }, status: 'CONFIRMED' },
      select: { accountId: true, merchantKey: true },
    }) : Promise.resolve([]),
    ownerIds.length ? prisma.financeLimit.findMany({
      where: { userId: { in: ownerIds }, enabled: true, OR: [{ accountId: null }, { accountId: { in: accountIds } }] },
      orderBy: { updatedAt: 'desc' },
    }) : Promise.resolve([]),
    ownerIds.length ? prisma.financeCoachFeedback.findMany({ where: { userId: { in: ownerIds } } }) : Promise.resolve([]),
  ])
  const metadata = await loadFinanceMetadata(accountIds, ownerIds, transactions.map(transaction => transaction.id))
  const enriched = transactions.map(transaction => ({
    id: transaction.id,
    accountId: transaction.accountId,
    currency: transaction.currency,
    bookingDate: transaction.bookingDate,
    status: transaction.status,
    ...enrichStoredTransaction(transaction, metadata),
  }))
  const confirmedKeys = new Set(subscriptions.map(item => `${item.accountId}|${item.merchantKey}`))
  const allSignals = buildCoachSignals(enriched, confirmedKeys)
  const feedbackByKey = new Map(feedback.map(item => [item.signalKey, item]))
  const now = new Date()
  const signals = allSignals.filter(signal => {
    const item = feedbackByKey.get(signal.key)
    if (!item) return true
    if (item.state === 'DISMISSED') return false
    return !item.snoozedUntil || item.snoozedUntil <= now
  })
  return res.status(200).json({
    canManage: access.canManage,
    signals,
    hiddenSignalCount: allSignals.length - signals.length,
    limits: buildLimitProgress(limits, enriched),
    defaults: { discretionaryOnly: true, periodDays: 30, smallPurchaseAmount: 15 },
  })
}

export default withApiHandler(handler)
