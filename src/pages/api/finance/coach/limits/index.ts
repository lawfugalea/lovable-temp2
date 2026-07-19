import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isFinanceCategory, normalizeMerchantKey } from '@/lib/finance/metadata'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const accountId = typeof req.body?.accountId === 'string' && req.body.accountId ? req.body.accountId : null
  if (accountId) {
    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, connection: { userId: access.userId } }, select: { id: true } })
    if (!account) return res.status(404).json({ error: 'Bank account not found' })
  }
  const scope = req.body?.scope === 'MERCHANT' ? 'MERCHANT' : req.body?.scope === 'CATEGORY' ? 'CATEGORY' : null
  const rawName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim().slice(0, 160) : ''
  const amount = Number(req.body?.amount)
  if (!scope || !rawName || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Scope, name, and a positive monthly amount are required' })
  if (scope === 'CATEGORY' && !isFinanceCategory(rawName)) return res.status(400).json({ error: 'Choose a valid category' })
  const scopeKey = scope === 'MERCHANT' ? normalizeMerchantKey(rawName) : rawName
  if (scopeKey.length < 3) return res.status(400).json({ error: 'Merchant name is too short' })
  const limit = await prisma.financeLimit.create({
    data: { userId: access.userId, accountId, scope, scopeKey, displayName: rawName, amount, currency: typeof req.body?.currency === 'string' ? req.body.currency.toUpperCase().slice(0, 3) : 'EUR' },
  })
  return res.status(201).json({ limit })
}

export default withApiHandler(handler)
