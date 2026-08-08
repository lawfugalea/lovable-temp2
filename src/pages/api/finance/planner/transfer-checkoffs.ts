import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { financePeriod, isFinancePeriod } from '@/lib/finance/money-flow'
import { canManagePlanAccount } from '@/lib/finance/plan-account-server'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return
  const ruleId = typeof req.body?.ruleId === 'string' ? req.body.ruleId : ''
  const period = req.body?.period
  if (!ruleId || !isFinancePeriod(period)) return res.status(400).json({ error: 'Invalid transfer or month' })
  if (period > financePeriod()) return res.status(400).json({ error: 'Future transfers cannot be marked complete' })

  const rule = await prisma.financeFundingRule.findFirst({
    where: { id: ruleId, householdId: access.householdId, archivedAt: null },
    include: { sourceAccount: true },
  })
  if (!rule || !canManagePlanAccount(rule.sourceAccount, access.userId)) {
    return res.status(404).json({ error: 'Funding rule not found' })
  }
  if (req.body?.completed === true) {
    await prisma.financeTransferCheckoff.upsert({
      where: { ruleId_period: { ruleId, period } },
      create: {
        ruleId,
        period,
        amountCents: rule.amountCents,
        completedById: access.userId,
        completedAt: new Date(),
      },
      update: {
        amountCents: rule.amountCents,
        completedById: access.userId,
        completedAt: new Date(),
      },
    })
  } else {
    await prisma.financeTransferCheckoff.deleteMany({ where: { ruleId, period } })
  }
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)

