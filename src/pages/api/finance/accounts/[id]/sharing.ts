import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId, { manage: true, bank: true })
  if (!access) return
  if (typeof req.body?.shared !== 'boolean') {
    return res.status(400).json({ error: 'shared must be true or false' })
  }
  const accountId = typeof req.query.id === 'string' ? req.query.id : ''
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, connection: { userId: access.userId } },
    select: { id: true },
  })
  if (!account) return res.status(404).json({ error: 'Bank account not found' })

  if (req.body.shared) {
    await prisma.bankAccountShare.upsert({
      where: { accountId_householdId: { accountId: account.id, householdId: access.householdId } },
      create: { accountId: account.id, householdId: access.householdId, createdById: access.userId },
      update: { createdById: access.userId },
    })
  } else {
    await prisma.bankAccountShare.deleteMany({
      where: { accountId: account.id, householdId: access.householdId },
    })
  }
  return res.status(200).json({ ok: true, shared: req.body.shared })
}

export default withApiHandler(handler)
