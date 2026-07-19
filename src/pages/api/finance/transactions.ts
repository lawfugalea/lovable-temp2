import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'

function queryDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return

  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : null
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
  const status = req.query.status === 'BOOKED' || req.query.status === 'PENDING' ? req.query.status : null
  const dateFrom = queryDate(req.query.dateFrom)
  const dateTo = queryDate(req.query.dateTo)
  if ((req.query.dateFrom && !dateFrom) || (req.query.dateTo && !dateTo)) {
    return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format' })
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return res.status(400).json({ error: 'dateFrom must be before dateTo' })
  }

  const accountWhere = accessibleBankAccountWhere(access)
  const where: Prisma.BankTransactionWhereInput = {
    account: accountWhere,
    ...(accountId ? { accountId } : {}),
    ...(status ? { status } : {}),
    ...((dateFrom || dateTo) ? {
      bookingDate: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    } : {}),
    ...(search ? {
      OR: [
        { counterparty: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  }

  if (accountId) {
    const allowed = await prisma.bankAccount.findFirst({ where: { id: accountId, ...accountWhere }, select: { id: true } })
    if (!allowed) return res.status(404).json({ error: 'Bank account not found' })
  }

  const page = await prisma.bankTransaction.findMany({
    where,
    include: { account: { select: { id: true, displayName: true, customName: true, maskedIdentifier: true, connection: { select: { userId: true } } } } },
    orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
  const hasMore = page.length > 50
  const items = hasMore ? page.slice(0, 50) : page
  const metadata = await loadFinanceMetadata(
    [...new Set(items.map(transaction => transaction.accountId))],
    [...new Set(items.map(transaction => transaction.account.connection.userId))],
    items.map(transaction => transaction.id),
  )

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    transactions: items.map(transaction => {
      const enriched = enrichStoredTransaction(transaction, metadata)
      return {
        id: transaction.id,
        account: {
          id: transaction.account.id,
          displayName: transaction.account.customName || transaction.account.displayName,
          providerDisplayName: transaction.account.displayName,
          maskedIdentifier: transaction.account.maskedIdentifier,
        },
        canEdit: access.canManage && transaction.account.connection.userId === access.userId,
        amount: String(enriched.signedAmount),
        currency: transaction.currency,
        status: transaction.status,
        bookingDate: transaction.bookingDate,
        valueDate: transaction.valueDate,
        counterparty: transaction.counterparty,
        description: transaction.description,
        ...enriched,
      }
    }),
    nextCursor: hasMore ? items.at(-1)?.id || null : null,
  })
}

export default withApiHandler(handler)
