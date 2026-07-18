import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'
import { detectSubscriptions, subscriptionDueState } from '@/lib/finance/subscriptions'
import { normalizeMerchantKey } from '@/lib/finance/metadata'

type SerializedSubscription = {
  id: string | null
  accountId: string
  merchantKey: string
  displayName: string
  status: string
  cadence: string
  intervalDays: number | null
  expectedAmount: string | number | null
  amountTolerance: string | number | null
  currency: string
  nextExpectedDate: string | null
  lastSeenAt: string | null
  reminderDays: number
  occurrenceCount: number
  confidence: number
  manual: boolean
  detectionSource: string
  detectionReason: string
  serviceCategory: string | null
  priceChanged: boolean
  previousTypicalAmount: number | null
  latestAmount: number | null
  transactionIds: string[]
  dueState: string | null
  account: { id: string; displayName: string } | null
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function numberValue(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = req.method === 'GET'
    ? (typeof req.query.householdId === 'string' ? req.query.householdId : undefined)
    : (typeof req.body?.householdId === 'string' ? req.body.householdId : undefined)
  const access = await requireFinanceAccess(req, res, householdId, { manage: req.method !== 'GET', bank: true })
  if (!access) return

  if (req.method === 'GET') {
    const accountWhere = accessibleBankAccountWhere(access)
    const accounts = await prisma.bankAccount.findMany({
      where: accountWhere,
      select: { id: true, displayName: true, customName: true, connection: { select: { userId: true } } },
    })
    const requestedAccountId = typeof req.query.accountId === 'string' ? req.query.accountId : null
    const accountIds = accounts.map(account => account.id).filter(id => !requestedAccountId || id === requestedAccountId)
    if (requestedAccountId && !accountIds.length) return res.status(404).json({ error: 'Bank account not found' })
    const from = new Date()
    from.setUTCDate(from.getUTCDate() - 420)
    const transactions = accountIds.length ? await prisma.bankTransaction.findMany({
      where: { accountId: { in: accountIds }, status: 'BOOKED', bookingDate: { gte: from } },
      orderBy: { bookingDate: 'asc' },
    }) : []
    const metadata = await loadFinanceMetadata(accountIds, [...new Set(accounts.map(account => account.connection.userId))], transactions.map(transaction => transaction.id))
    const enriched = transactions.map(transaction => ({
      id: transaction.id,
      accountId: transaction.accountId,
      currency: transaction.currency,
      bookingDate: transaction.bookingDate,
      status: transaction.status,
      ...enrichStoredTransaction(transaction, metadata),
    }))
    const detected = detectSubscriptions(enriched)
    const saved = accountIds.length ? await prisma.financeSubscription.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { updatedAt: 'desc' },
    }) : []
    const savedByKey = new Map(saved.map(item => [`${item.accountId}|${item.merchantKey}`, item]))
    const accountById = new Map(accounts.map(account => [account.id, account]))
    const items: SerializedSubscription[] = detected.map(candidate => {
      const stored = savedByKey.get(`${candidate.accountId}|${candidate.merchantKey}`)
      if (stored) savedByKey.delete(`${candidate.accountId}|${candidate.merchantKey}`)
      const account = accountById.get(candidate.accountId)
      const nextExpectedDate = stored?.nextExpectedDate?.toISOString().slice(0, 10) || candidate.nextExpectedDate
      const reminderDays = stored?.reminderDays ?? 3
      return {
        ...candidate,
        id: stored?.id || null,
        displayName: stored?.displayName || candidate.displayName,
        status: stored?.status || 'CANDIDATE',
        cadence: stored?.cadence || candidate.cadence,
        intervalDays: stored?.intervalDays ?? candidate.intervalDays,
        expectedAmount: stored?.expectedAmount?.toString() || candidate.expectedAmount,
        amountTolerance: stored?.amountTolerance?.toString() || candidate.amountTolerance,
        nextExpectedDate,
        reminderDays,
        manual: stored?.manual || false,
        dueState: (stored?.status || 'CANDIDATE') === 'CONFIRMED' ? subscriptionDueState(nextExpectedDate, reminderDays) : null,
        account: account ? { id: account.id, displayName: account.customName || account.displayName } : null,
      }
    })
    for (const stored of savedByKey.values()) {
      const account = accountById.get(stored.accountId)
      items.push({
        id: stored.id,
        accountId: stored.accountId,
        merchantKey: stored.merchantKey,
        displayName: stored.displayName,
        status: stored.status,
        cadence: stored.cadence,
        intervalDays: stored.intervalDays,
        expectedAmount: stored.expectedAmount?.toString() || null,
        amountTolerance: stored.amountTolerance?.toString() || null,
        currency: stored.currency,
        nextExpectedDate: stored.nextExpectedDate?.toISOString().slice(0, 10) || null,
        lastSeenAt: stored.lastSeenAt?.toISOString().slice(0, 10) || null,
        reminderDays: stored.reminderDays,
        occurrenceCount: stored.occurrenceCount,
        confidence: stored.confidence,
        manual: stored.manual,
        detectionSource: stored.manual ? 'MANUAL' : 'RECURRING_PATTERN',
        detectionReason: stored.manual ? 'Added manually.' : 'Previously reviewed recurring payment.',
        serviceCategory: null,
        priceChanged: false,
        previousTypicalAmount: null,
        latestAmount: null,
        transactionIds: [],
        dueState: stored.status === 'CONFIRMED' ? subscriptionDueState(stored.nextExpectedDate, stored.reminderDays) : null,
        account: account ? { id: account.id, displayName: account.customName || account.displayName } : null,
      })
    }
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : ''
    const filtered = status ? items.filter(item => item.status === status) : items
    return res.status(200).json({
      canManage: access.canManage,
      subscriptions: filtered.sort((left, right) => String(left.nextExpectedDate || '9999').localeCompare(String(right.nextExpectedDate || '9999'))),
      reminders: items.filter(item => item.status === 'CONFIRMED' && (item.dueState === 'DUE' || item.dueState === 'OVERDUE')),
    })
  }

  if (req.method === 'POST') {
    const accountId = typeof req.body?.accountId === 'string' ? req.body.accountId : ''
    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, connection: { userId: access.userId } }, select: { id: true, currency: true } })
    if (!account) return res.status(404).json({ error: 'Bank account not found' })
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim().slice(0, 160) : ''
    const manual = Boolean(req.body?.manual)
    const merchantKey = normalizeMerchantKey(typeof req.body?.merchantKey === 'string' ? req.body.merchantKey : displayName)
    const status = ['CANDIDATE', 'CONFIRMED', 'DISMISSED'].includes(req.body?.status) ? req.body.status : 'CONFIRMED'
    const cadence = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'].includes(req.body?.cadence) ? req.body.cadence : null
    if (!displayName || merchantKey.length < 3 || !cadence) return res.status(400).json({ error: 'Name, merchant, and cadence are required' })
    const expectedAmount = numberValue(req.body?.expectedAmount)
    const amountTolerance = numberValue(req.body?.amountTolerance)
    const rawReminderDays = Number(req.body?.reminderDays ?? 3)
    const reminderDays = Number.isFinite(rawReminderDays) ? Math.max(0, Math.min(30, Math.round(rawReminderDays))) : 3
    const subscription = await prisma.financeSubscription.upsert({
      where: { accountId_merchantKey: { accountId, merchantKey } },
      create: {
        userId: access.userId, accountId, merchantKey, displayName, status, cadence,
        intervalDays: numberValue(req.body?.intervalDays), expectedAmount, amountTolerance,
        currency: typeof req.body?.currency === 'string' ? req.body.currency.toUpperCase().slice(0, 3) : account.currency,
        nextExpectedDate: dateValue(req.body?.nextExpectedDate), lastSeenAt: dateValue(req.body?.lastSeenAt),
        reminderDays, occurrenceCount: Math.max(0, Math.round(Number(req.body?.occurrenceCount || 0))),
        confidence: Math.max(0, Math.min(1, Number(req.body?.confidence || 0))), manual,
      },
      update: {
        displayName, status, cadence, intervalDays: numberValue(req.body?.intervalDays), expectedAmount,
        amountTolerance, nextExpectedDate: dateValue(req.body?.nextExpectedDate), reminderDays,
        lastSeenAt: dateValue(req.body?.lastSeenAt), occurrenceCount: Math.max(0, Math.round(Number(req.body?.occurrenceCount || 0))),
        confidence: Math.max(0, Math.min(1, Number(req.body?.confidence || 0))), manual,
      },
    })
    return res.status(201).json({ subscription })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
