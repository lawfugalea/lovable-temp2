import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { accessibleBankAccountIds, requireFinanceAccess } from '@/lib/finance/access'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { bank: true })
  if (!access) return
  const accounts = await prisma.bankAccount.findMany({ where: { id: { in: await accessibleBankAccountIds(access) } }, select: { id: true, connection: { select: { userId: true } } } })
  const allowedIds = new Set(accounts.map(account => account.id))
  const ownerIds = [...new Set(accounts.map(account => account.connection.userId))]
  const analyses = ownerIds.length ? await prisma.financeAiAnalysis.findMany({ where: { userId: { in: ownerIds } }, orderBy: { createdAt: 'desc' }, take: 20 }) : []
  const visible = analyses.find(item => Array.isArray(item.accountIds) && (item.accountIds as unknown[]).every(id => typeof id === 'string' && allowedIds.has(id)))
  return res.status(200).json({ analysis: visible?.result || null, createdAt: visible?.createdAt || null, canManage: access.canManage })
}

export default withApiHandler(handler)
