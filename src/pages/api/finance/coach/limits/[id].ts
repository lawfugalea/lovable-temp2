import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true })
  if (!access) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const limit = await prisma.financeLimit.findFirst({ where: { id, userId: access.userId } })
  if (!limit) return res.status(404).json({ error: 'Spending limit not found' })
  if (req.method === 'DELETE') {
    await prisma.financeLimit.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }
  if (req.method === 'PATCH') {
    const amount = req.body?.amount === undefined ? undefined : Number(req.body.amount)
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) return res.status(400).json({ error: 'Amount must be positive' })
    const updated = await prisma.financeLimit.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount } : {}),
        ...(typeof req.body?.enabled === 'boolean' ? { enabled: req.body.enabled } : {}),
      },
    })
    return res.status(200).json({ limit: updated })
  }
  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}
