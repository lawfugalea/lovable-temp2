import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import {
  isFinancePlanAccountType,
  isFinancePlanAccountVisibility,
} from '@/lib/finance/money-flow'
import { canManagePlanAccount, parseNonNegativeCents } from '@/lib/finance/plan-account-server'

function accountInput(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : ''
  if (!name) return { error: 'Account name is required' } as const
  if (!isFinancePlanAccountType(body.type)) return { error: 'Choose a valid account role' } as const
  if (!isFinancePlanAccountVisibility(body.visibility)) return { error: 'Choose whether this account is shared or private' } as const
  const monthlyBufferCents = parseNonNegativeCents(body.monthlyBuffer ?? 0)
  if (monthlyBufferCents === null) return { error: 'Enter a valid monthly amount' } as const
  return { name, type: body.type, visibility: body.visibility, monthlyBufferCents } as const
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['POST', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return

  if (req.method === 'POST' && req.body?.starter === true) {
    const existing = await prisma.financePlanAccount.count({
      where: { householdId: access.householdId, archivedAt: null },
    })
    if (existing) return res.status(409).json({ error: 'Your money-flow accounts are already set up' })
    const created = await prisma.$transaction([
      prisma.financePlanAccount.create({
        data: {
          householdId: access.householdId,
          ownerUserId: access.userId,
          name: 'My personal account',
          type: 'PERSONAL',
          visibility: 'PRIVATE',
          sortOrder: 0,
        },
      }),
      prisma.financePlanAccount.create({
        data: {
          householdId: access.householdId,
          ownerUserId: access.userId,
          name: 'Family spending',
          type: 'HOUSEHOLD_SPENDING',
          visibility: 'SHARED',
          sortOrder: 1,
        },
      }),
      prisma.financePlanAccount.create({
        data: {
          householdId: access.householdId,
          ownerUserId: access.userId,
          name: 'Commitments',
          type: 'COMMITMENTS',
          visibility: 'SHARED',
          sortOrder: 2,
        },
      }),
      prisma.financePlanAccount.create({
        data: {
          householdId: access.householdId,
          ownerUserId: access.userId,
          name: 'Savings',
          type: 'SAVINGS',
          visibility: 'SHARED',
          sortOrder: 3,
        },
      }),
    ])
    return res.status(201).json({ ids: created.map(account => account.id) })
  }

  if (req.method === 'POST') {
    const count = await prisma.financePlanAccount.count({
      where: { householdId: access.householdId, archivedAt: null },
    })
    if (count >= 20) return res.status(400).json({ error: 'Planning account limit reached' })
    const input = accountInput(req.body ?? {})
    if ('error' in input) return res.status(400).json({ error: input.error })
    const maxOrder = await prisma.financePlanAccount.aggregate({
      where: { householdId: access.householdId, archivedAt: null },
      _max: { sortOrder: true },
    })
    const created = await prisma.financePlanAccount.create({
      data: {
        householdId: access.householdId,
        ownerUserId: access.userId,
        ...input,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    })
    return res.status(201).json({ id: created.id })
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (!id) return res.status(400).json({ error: 'Missing account id' })
  const account = await prisma.financePlanAccount.findFirst({
    where: { id, householdId: access.householdId, archivedAt: null },
  })
  if (!account || !canManagePlanAccount(account, access.userId)) {
    return res.status(404).json({ error: 'Planning account not found' })
  }

  if (req.method === 'DELETE') {
    const [incomeCount, commitmentCount, goalCount, ruleCount] = await Promise.all([
      prisma.incomeSource.count({ where: { planAccountId: id } }),
      prisma.commitment.count({ where: { planAccountId: id } }),
      prisma.savingsGoal.count({ where: { planAccountId: id } }),
      prisma.financeFundingRule.count({
        where: { archivedAt: null, OR: [{ sourceAccountId: id }, { targetAccountId: id }] },
      }),
    ])
    if (incomeCount + commitmentCount + goalCount + ruleCount > 0) {
      return res.status(409).json({ error: 'Move this account’s entries and transfers before archiving it' })
    }
    await prisma.financePlanAccount.update({ where: { id }, data: { archivedAt: new Date() } })
    return res.status(200).json({ ok: true })
  }

  const input = accountInput(req.body ?? {})
  if ('error' in input) return res.status(400).json({ error: input.error })
  if (input.visibility !== account.visibility) {
    if (account.ownerUserId !== access.userId) {
      return res.status(403).json({ error: 'Only the account owner can change its privacy' })
    }
    if (account.visibility === 'PRIVATE' && input.visibility === 'SHARED' && req.body?.confirmVisibility !== true) {
      return res.status(409).json({ error: 'Confirm that assigned account details will become visible to the household' })
    }
    if (input.visibility === 'PRIVATE') {
      const incompatibleRule = await prisma.financeFundingRule.findFirst({
        where: {
          targetAccountId: id,
          archivedAt: null,
          OR: [
            { sourceAccount: { visibility: 'SHARED' } },
            { sourceAccount: { ownerUserId: { not: access.userId } } },
          ],
        },
        select: { id: true },
      })
      if (incompatibleRule) {
        return res.status(409).json({ error: 'Remove incoming shared transfers before making this account private' })
      }
    }
  }
  await prisma.financePlanAccount.update({ where: { id }, data: input })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)


