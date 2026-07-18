import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  const accountId = typeof req.query.id === 'string' ? req.query.id : ''
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, connection: { userId: access.userId } },
    select: { id: true, displayName: true },
  })
  if (!account) return res.status(404).json({ error: 'Bank account not found' })
  if (req.body?.customName !== null && typeof req.body?.customName !== 'string') {
    return res.status(400).json({ error: 'customName must be text or null' })
  }
  const customName = typeof req.body.customName === 'string' ? req.body.customName.trim() : null
  if (customName && customName.length > 80) return res.status(400).json({ error: 'Friendly name must be 80 characters or fewer' })
  const updated = await prisma.bankAccount.update({
    where: { id: account.id },
    data: { customName: customName || null },
    select: { id: true, displayName: true, customName: true },
  })
  return res.status(200).json({
    ...updated,
    providerDisplayName: updated.displayName,
    displayName: updated.customName || updated.displayName,
  })
}
