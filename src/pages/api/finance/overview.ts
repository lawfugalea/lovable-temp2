import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountWhere, requireFinanceAccess } from '@/lib/finance/access'
import { isFinanceProviderConfigured } from '@/lib/finance/config'
import { isAvailableBalanceType, isBookedBalanceType } from '@/lib/finance/normalization'
import { enrichStoredTransaction, loadFinanceMetadata } from '@/lib/finance/server-metadata'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return

  if (!access.bankEnabled) {
    // Planner-only households: no bank surface at all.
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({
      bankEnabled: false,
      canManage: access.canManage,
      providerConfigured: false,
      accounts: [],
      connections: [],
      totals: [],
      recentTransactions: [],
    })
  }

  const accountWhere = accessibleBankAccountWhere(access)
  const [accounts, recentTransactions, connections] = await Promise.all([
    prisma.bankAccount.findMany({
      where: accountWhere,
      include: {
        connection: {
          select: {
            id: true,
            userId: true,
            aspspName: true,
            status: true,
            consentExpiresAt: true,
            lastSyncedAt: true,
            lastSyncAttemptAt: true,
            syncStartedAt: true,
            syncError: true,
          },
        },
        balances: true,
        shares: { where: { householdId: access.householdId }, select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.bankTransaction.findMany({
      where: { account: accountWhere },
      include: { account: { select: { id: true, displayName: true, customName: true, maskedIdentifier: true, connection: { select: { userId: true } } } } },
      orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    }),
    // Scoped to the signed-in user, so a member sees their own connection and
    // nobody else's.
    prisma.bankConnection.findMany({
      where: { userId: access.userId },
      select: {
        id: true,
        aspspName: true,
        status: true,
        consentExpiresAt: true,
        lastSyncedAt: true,
        lastSyncAttemptAt: true,
        syncStartedAt: true,
        syncError: true,
        _count: { select: { accounts: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const metadata = await loadFinanceMetadata(
    accounts.map(account => account.id),
    [...new Set(accounts.map(account => account.connection.userId))],
    recentTransactions.map(transaction => transaction.id),
  )

  const totals = new Map<string, number>()
  const serializedAccounts = accounts.map(account => {
    const available = account.balances.find(balance => isAvailableBalanceType(balance.balanceType))
    const booked = account.balances.find(balance => isBookedBalanceType(balance.balanceType))
    const primary = available || booked || account.balances[0] || null
    if (primary) totals.set(primary.currency, (totals.get(primary.currency) || 0) + Number(primary.amount))
    return {
      id: account.id,
      displayName: account.customName || account.displayName,
      providerDisplayName: account.displayName,
      customName: account.customName,
      maskedIdentifier: account.maskedIdentifier,
      currency: account.currency,
      cashAccountType: account.cashAccountType,
      shared: account.shares.length > 0,
      owned: account.connection.userId === access.userId,
      canRename: account.connection.userId === access.userId,
      balance: primary ? {
        amount: primary.amount.toString(),
        currency: primary.currency,
        type: primary.balanceType,
        updatedAt: primary.updatedAt,
      } : null,
      availableBalance: available ? { amount: available.amount.toString(), currency: available.currency } : null,
      bookedBalance: booked ? { amount: booked.amount.toString(), currency: booked.currency } : null,
      connection: account.connection,
    }
  })

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    bankEnabled: true,
    canManage: access.canManage,
    providerConfigured: isFinanceProviderConfigured(),
    accounts: serializedAccounts,
    connections,
    totals: [...totals].map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })),
    recentTransactions: recentTransactions.map(transaction => {
      const enriched = enrichStoredTransaction(transaction, metadata)
      return {
        id: transaction.id,
        account: {
          id: transaction.account.id,
          displayName: transaction.account.customName || transaction.account.displayName,
          providerDisplayName: transaction.account.displayName,
          maskedIdentifier: transaction.account.maskedIdentifier,
        },
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
  })
}

export default withApiHandler(handler)
