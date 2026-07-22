import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileFinanceSubscription } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { accessibleBankAccountWhere } from '@/lib/finance/access'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'
import { detectSubscriptions, subscriptionDueState } from '@/lib/finance/subscriptions'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).json({ error: 'Method not allowed' }) }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const accountWhere = accessibleBankAccountWhere(access)
  const accounts = await prisma.bankAccount.findMany({ where: accountWhere, select: { id: true, displayName: true, customName: true, connection: { select: { userId: true } } } })
  const accountIds = accounts.map(account => account.id)
  const from = new Date(); from.setUTCDate(from.getUTCDate() - 420)
  const transactions = accountIds.length ? await prisma.bankTransaction.findMany({ where: { accountId: { in: accountIds }, status: 'BOOKED', bookingDate: { gte: from } }, orderBy: { bookingDate: 'asc' } }) : []
  const metadata = await loadFinanceMetadata(accountIds, [...new Set(accounts.map(account => account.connection.userId))], transactions.map(transaction => transaction.id))
  const detected = detectSubscriptions(transactions.map(transaction => ({ id: transaction.id, accountId: transaction.accountId, currency: transaction.currency, bookingDate: transaction.bookingDate, status: transaction.status, ...enrichStoredTransaction(transaction, metadata) })))
  const saved = accountIds.length ? await prisma.financeSubscription.findMany({ where: { accountId: { in: accountIds } }, orderBy: { updatedAt: 'desc' } }) : []
  const savedByKey = new Map(saved.map(item => [`${item.accountId}|${item.merchantKey}`, item]))
  const accountById = new Map(accounts.map(account => [account.id, account]))
  const items: MobileFinanceSubscription[] = detected.map(candidate => {
    const stored = savedByKey.get(`${candidate.accountId}|${candidate.merchantKey}`)
    if (stored) savedByKey.delete(`${candidate.accountId}|${candidate.merchantKey}`)
    const account = accountById.get(candidate.accountId)
    const nextExpectedDate = stored?.nextExpectedDate?.toISOString().slice(0, 10) || candidate.nextExpectedDate
    const reminderDays = stored?.reminderDays ?? 3
    const status = stored?.status || 'CANDIDATE'
    return { id: stored?.id || null, displayName: stored?.displayName || candidate.displayName, status, cadence: stored?.cadence || candidate.cadence, expectedAmount: stored?.expectedAmount?.toString() || candidate.expectedAmount, currency: candidate.currency, nextExpectedDate, lastSeenAt: stored?.lastSeenAt?.toISOString().slice(0, 10) || candidate.lastSeenAt, reminderDays, occurrenceCount: stored?.occurrenceCount ?? candidate.occurrenceCount, confidence: stored?.confidence ?? candidate.confidence, dueState: status === 'CONFIRMED' ? subscriptionDueState(nextExpectedDate, reminderDays) : null, priceChanged: candidate.priceChanged, account: account ? { id: account.id, displayName: account.customName || account.displayName } : null }
  })
  for (const stored of savedByKey.values()) {
    const account = accountById.get(stored.accountId)
    items.push({ id: stored.id, displayName: stored.displayName, status: stored.status, cadence: stored.cadence, expectedAmount: stored.expectedAmount?.toString() || null, currency: stored.currency, nextExpectedDate: stored.nextExpectedDate?.toISOString().slice(0, 10) || null, lastSeenAt: stored.lastSeenAt?.toISOString().slice(0, 10) || null, reminderDays: stored.reminderDays, occurrenceCount: stored.occurrenceCount, confidence: stored.confidence, dueState: stored.status === 'CONFIRMED' ? subscriptionDueState(stored.nextExpectedDate, stored.reminderDays) : null, priceChanged: false, account: account ? { id: account.id, displayName: account.customName || account.displayName } : null })
  }
  items.sort((left, right) => String(left.nextExpectedDate || '9999').localeCompare(String(right.nextExpectedDate || '9999')))
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ subscriptions: items, reminders: items.filter(item => item.status === 'CONFIRMED' && (item.dueState === 'DUE' || item.dueState === 'OVERDUE')) })
}

export default withApiHandler(handler)
