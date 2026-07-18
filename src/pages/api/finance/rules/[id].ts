import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isFinanceCategory } from '@/lib/finance/metadata'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const rule = await prisma.financePatternRule.findFirst({ where: { id, userId: access.userId } })
  if (!rule) return res.status(404).json({ error: 'Pattern rule not found' })

  if (req.method === 'DELETE') {
    await prisma.financePatternRule.delete({ where: { id: rule.id } })
    return res.status(200).json({ ok: true })
  }
  if (req.method === 'PATCH') {
    const merchantName = req.body?.merchantName === undefined
      ? undefined
      : (typeof req.body.merchantName === 'string' ? req.body.merchantName.trim().slice(0, 160) || null : null)
    const category = req.body?.category === undefined
      ? undefined
      : (req.body.category === null || isFinanceCategory(req.body.category) ? req.body.category : undefined)
    if (req.body?.category !== undefined && category === undefined) return res.status(400).json({ error: 'Invalid category' })
    const updated = await prisma.financePatternRule.update({
      where: { id: rule.id },
      data: {
        ...(merchantName !== undefined ? { merchantName } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(typeof req.body?.enabled === 'boolean' ? { enabled: req.body.enabled } : {}),
      },
    })
    return res.status(200).json({ rule: updated })
  }
  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}
