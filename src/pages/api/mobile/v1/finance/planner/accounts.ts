import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { isFinancePlanAccountVisibility } from '@/lib/finance/savings'
import { canManagePlanAccount, parseNonNegativeCents } from '@/lib/finance/plan-account-server'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'

/**
 * Savings accounts on the phone.
 *
 * A deliberate mirror of the browser route at /api/finance/planner/accounts:
 * the same limit, the same validation, the same owner-only privacy rule and the
 * same confirmation before a private account becomes visible to the household.
 * Only the authentication differs — bearer token instead of a session.
 */
function accountInput(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : ''
  if (!name) return { error: 'Account name is required' } as const
  if (!isFinancePlanAccountVisibility(body.visibility)) return { error: 'Choose whether this account is shared or private' } as const
  const openingBalanceCents = parseNonNegativeCents(body.balance ?? 0)
  if (openingBalanceCents === null) return { error: 'Enter a valid balance' } as const
  const monthlyContributionCents = parseNonNegativeCents(body.monthlyContribution ?? 0)
  if (monthlyContributionCents === null) return { error: 'Enter a valid monthly amount' } as const
  return { name, visibility: body.visibility, openingBalanceCents, monthlyContributionCents } as const
}

/** Only re-stamp the balance date when the balance itself moved, so editing a name keeps it. */
function balanceStamp(nextCents: number, previousCents?: number) {
  if (nextCents === previousCents) return {}
  return { openingBalanceAt: nextCents > 0 ? new Date() : null }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['POST', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return

  if (req.method === 'POST') {
    const count = await prisma.financePlanAccount.count({ where: { householdId: access.householdId, archivedAt: null } })
    if (count >= 20) return res.status(400).json({ error: 'Savings account limit reached' })
    const input = accountInput(req.body ?? {})
    if ('error' in input) return res.status(400).json({ error: input.error })
    const maxOrder = await prisma.financePlanAccount.aggregate({
      where: { householdId: access.householdId },
      _max: { sortOrder: true },
    })
    const created = await prisma.financePlanAccount.create({
      data: {
        householdId: access.householdId,
        ownerUserId: access.userId,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        ...input,
        ...balanceStamp(input.openingBalanceCents),
      },
    })
    return res.status(201).json({ id: created.id })
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (!id) return res.status(400).json({ error: 'Missing account id' })
  const account = await prisma.financePlanAccount.findFirst({ where: { id, householdId: access.householdId } })
  if (!account || !canManagePlanAccount(account, access.userId)) {
    return res.status(404).json({ error: 'Savings account not found' })
  }

  if (req.method === 'DELETE') {
    const goalCount = await prisma.savingsGoal.count({ where: { planAccountId: id } })
    if (goalCount > 0) {
      return res.status(409).json({ error: 'Point this account’s goals somewhere else before removing it' })
    }
    await prisma.financePlanAccount.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  const input = accountInput(req.body ?? {})
  if ('error' in input) return res.status(400).json({ error: input.error })
  if (input.visibility !== account.visibility) {
    if (account.ownerUserId !== access.userId) {
      return res.status(403).json({ error: 'Only the account owner can change its privacy' })
    }
    if (account.visibility === 'PRIVATE' && input.visibility === 'SHARED' && req.body?.confirmVisibility !== true) {
      return res.status(409).json({ error: 'Confirm that this account will become visible to the household' })
    }
  }
  await prisma.financePlanAccount.update({
    where: { id },
    data: { ...input, ...balanceStamp(input.openingBalanceCents, account.openingBalanceCents) },
  })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
