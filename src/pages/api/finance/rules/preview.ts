import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { enrichTransaction } from '@/lib/finance/enrichment'
import { normalizeMerchantKey } from '@/lib/finance/metadata'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const transactionId = typeof req.body?.transactionId === 'string' ? req.body.transactionId : ''
  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, account: { connection: { userId: access.userId } } },
  })
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' })
  const base = enrichTransaction({
    amount: transaction.amount.toString(),
    counterparty: transaction.counterparty,
    description: transaction.description,
    providerData: transaction.providerData,
  })
  const matchType = req.body?.matchType === 'CONTAINS' ? 'CONTAINS' : 'EXACT'
  const matchValue = normalizeMerchantKey(typeof req.body?.matchValue === 'string' ? req.body.matchValue : base.merchantName)
  const candidates = await prisma.bankTransaction.findMany({
    where: req.body?.allAccounts
      ? { account: { connection: { userId: access.userId } } }
      : { accountId: transaction.accountId },
    orderBy: { bookingDate: 'desc' },
    take: 1000,
  })
  const matches = candidates.flatMap(candidate => {
    const enriched = enrichTransaction({ amount: candidate.amount.toString(), counterparty: candidate.counterparty, description: candidate.description, providerData: candidate.providerData })
    const key = normalizeMerchantKey(enriched.merchantName)
    const matched = matchType === 'CONTAINS' ? key.includes(matchValue) : key === matchValue
    return matched ? [{ id: candidate.id, merchantName: enriched.merchantName, amount: candidate.amount.toString(), currency: candidate.currency, bookingDate: candidate.bookingDate }] : []
  })
  return res.status(200).json({ matchType, matchValue, count: matches.length, samples: matches.slice(0, 8) })
}

export default withApiHandler(handler)
