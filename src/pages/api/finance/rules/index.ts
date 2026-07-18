import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isFinanceCategory, normalizeMerchantKey } from '@/lib/finance/metadata'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = req.method === 'GET'
    ? (typeof req.query.householdId === 'string' ? req.query.householdId : undefined)
    : (typeof req.body?.householdId === 'string' ? req.body.householdId : undefined)
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return

  if (req.method === 'GET') {
    const rules = await prisma.financePatternRule.findMany({
      where: { userId: access.userId },
      include: { account: { select: { id: true, displayName: true, customName: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    return res.status(200).json({ rules: rules.map(rule => ({
      ...rule,
      account: rule.account ? { ...rule.account, displayName: rule.account.customName || rule.account.displayName } : null,
    })) })
  }

  if (req.method === 'POST') {
    const accountId = typeof req.body?.accountId === 'string' && req.body.accountId ? req.body.accountId : null
    if (accountId) {
      const account = await prisma.bankAccount.findFirst({ where: { id: accountId, connection: { userId: access.userId } }, select: { id: true } })
      if (!account) return res.status(404).json({ error: 'Bank account not found' })
    }
    const matchType = req.body?.matchType === 'CONTAINS' ? 'CONTAINS' : 'EXACT'
    const matchValue = normalizeMerchantKey(String(req.body?.matchValue || ''))
    const merchantName = typeof req.body?.merchantName === 'string' ? req.body.merchantName.trim().slice(0, 160) : null
    const category = isFinanceCategory(req.body?.category) ? req.body.category : null
    if (matchValue.length < 3) return res.status(400).json({ error: 'The merchant pattern is too short' })
    if (!merchantName && !category) return res.status(400).json({ error: 'Set a merchant name or category' })
    const rule = await prisma.financePatternRule.create({
      data: { userId: access.userId, accountId, matchType, matchValue, merchantName: merchantName || null, category },
    })
    return res.status(201).json({ rule })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
