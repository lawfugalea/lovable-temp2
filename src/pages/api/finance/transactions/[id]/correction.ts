import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { enrichTransaction } from '@/lib/finance/enrichment'
import { isFinanceCategory, normalizeMerchantKey } from '@/lib/finance/metadata'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const transactionId = typeof req.query.id === 'string' ? req.query.id : ''
  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, account: { connection: { userId: access.userId } } },
  })
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' })
  if (req.method === 'DELETE') {
    await prisma.financeTransactionOverride.deleteMany({ where: { transactionId } })
    return res.status(200).json({ ok: true })
  }
  const merchantName = typeof req.body?.merchantName === 'string' ? req.body.merchantName.trim().slice(0, 160) : ''
  const category = isFinanceCategory(req.body?.category) ? req.body.category : null
  if (!merchantName && !category) return res.status(400).json({ error: 'Set a merchant name or category' })
  if (req.body?.applyToSimilar) {
    const local = enrichTransaction({ amount: transaction.amount.toString(), counterparty: transaction.counterparty, description: transaction.description, providerData: transaction.providerData })
    const matchValue = normalizeMerchantKey(typeof req.body?.matchValue === 'string' ? req.body.matchValue : local.merchantName)
    if (matchValue.length < 3) return res.status(400).json({ error: 'The merchant pattern is too short' })
    const rule = await prisma.financePatternRule.create({
      data: {
        userId: access.userId,
        accountId: req.body?.allAccounts ? null : transaction.accountId,
        matchType: req.body?.matchType === 'CONTAINS' ? 'CONTAINS' : 'EXACT',
        matchValue,
        merchantName: merchantName || null,
        category,
      },
    })
    await prisma.financeTransactionOverride.deleteMany({ where: { transactionId } })
    return res.status(201).json({ rule })
  }
  const override = await prisma.financeTransactionOverride.upsert({
    where: { transactionId },
    create: { userId: access.userId, accountId: transaction.accountId, transactionId, merchantName: merchantName || null, category },
    update: { merchantName: merchantName || null, category },
  })
  return res.status(200).json({ override })
}

export default withApiHandler(handler)
