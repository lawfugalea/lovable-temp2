import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import {
  assignmentAccountId,
  canSeePlanAccount,
  parseNonNegativeCents,
} from '@/lib/finance/plan-account-server'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return
  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  const kind = req.body?.kind
  if (!id || !['income', 'commitment', 'goal'].includes(kind)) {
    return res.status(400).json({ error: 'Invalid planner entry' })
  }

  let planAccountId: string | null
  try {
    planAccountId = await assignmentAccountId(access.householdId, access.userId, req.body?.planAccountId)
  } catch {
    return res.status(404).json({ error: 'Planning account not found' })
  }
  const visibleWhere = {
    id,
    householdId: access.householdId,
    OR: [
      { planAccountId: null },
      { planAccount: { visibility: 'SHARED' as const } },
      { planAccount: { ownerUserId: access.userId } },
    ],
  }

  if (kind === 'income') {
    const existing = await prisma.incomeSource.findFirst({ where: visibleWhere, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Income source not found' })
    await prisma.incomeSource.update({ where: { id }, data: { planAccountId } })
  } else if (kind === 'commitment') {
    const existing = await prisma.commitment.findFirst({ where: visibleWhere, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Commitment not found' })
    await prisma.commitment.update({ where: { id }, data: { planAccountId } })
  } else {
    const existing = await prisma.savingsGoal.findFirst({ where: visibleWhere, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Savings goal not found' })
    let monthlyContributionCents: number | null | undefined
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'monthlyContribution')) {
      if (req.body?.monthlyContribution === '' || req.body?.monthlyContribution === null) {
        monthlyContributionCents = null
      } else {
        monthlyContributionCents = parseNonNegativeCents(req.body?.monthlyContribution, { nullable: true })
        if (monthlyContributionCents === null) {
          return res.status(400).json({ error: 'Enter a valid monthly contribution' })
        }
      }
    }
    await prisma.savingsGoal.update({
      where: { id },
      data: {
        planAccountId,
        ...(monthlyContributionCents !== undefined ? { monthlyContributionCents } : {}),
      },
    })
  }
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)


