import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { MoneyFlowAiOperation } from './money-flow-ai'

type FinanceDb = typeof prisma | Prisma.TransactionClient

export async function moneyFlowStateHash(db: FinanceDb, householdId: string, userId: string): Promise<string> {
  const accounts = await db.financePlanAccount.findMany({
    where: {
      householdId,
      archivedAt: null,
      OR: [{ visibility: 'SHARED' }, { ownerUserId: userId }],
    },
    select: {
      id: true,
      ownerUserId: true,
      type: true,
      visibility: true,
      monthlyBufferCents: true,
      updatedAt: true,
    },
    orderBy: { id: 'asc' },
  })
  const accountIds = accounts.map(account => account.id)
  const entryWhere = {
    householdId,
    OR: [{ planAccountId: null }, { planAccountId: { in: accountIds } }],
  }
  const [incomes, commitments, goals, rules] = await Promise.all([
    db.incomeSource.findMany({
      where: entryWhere,
      select: { id: true, amountCents: true, frequency: true, planAccountId: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
    db.commitment.findMany({
      where: entryWhere,
      select: { id: true, category: true, essential: true, amountCents: true, frequency: true, planAccountId: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
    db.savingsGoal.findMany({
      where: entryWhere,
      select: { id: true, targetCents: true, savedCents: true, targetDate: true, monthlyContributionCents: true, planAccountId: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
    db.financeFundingRule.findMany({
      where: { householdId, archivedAt: null, targetAccountId: { in: accountIds } },
      select: { id: true, sourceAccountId: true, targetAccountId: true, amountCents: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
  ])
  return createHash('sha256').update(JSON.stringify({ accounts, incomes, commitments, goals, rules })).digest('hex')
}

function visibleEntryWhere(householdId: string, userId: string, id: string) {
  return {
    id,
    householdId,
    OR: [
      { planAccountId: null },
      { planAccount: { visibility: 'SHARED' as const } },
      { planAccount: { ownerUserId: userId } },
    ],
  }
}

export async function applyMoneyFlowAiOperations(
  tx: Prisma.TransactionClient,
  householdId: string,
  userId: string,
  operations: MoneyFlowAiOperation[],
): Promise<void> {
  const accounts = await tx.financePlanAccount.findMany({
    where: {
      householdId,
      archivedAt: null,
      OR: [{ visibility: 'SHARED' }, { ownerUserId: userId }],
    },
  })
  const accountById = new Map(accounts.map(account => [account.id, account]))

  for (const operation of operations) {
    if (operation.kind === 'assign_entry') {
      const account = accountById.get(operation.accountId)
      if (!account) throw new Error('A proposed planning account is no longer available')
      if (operation.entryKind === 'income') {
        const item = await tx.incomeSource.findFirst({ where: visibleEntryWhere(householdId, userId, operation.entryId), select: { id: true, planAccountId: true } })
        if (!item) throw new Error('A proposed income source is no longer available')
        if (account.visibility === 'PRIVATE' && item.planAccountId !== account.id) throw new Error('AI cannot make a shared entry private')
        await tx.incomeSource.update({ where: { id: item.id }, data: { planAccountId: account.id } })
      } else if (operation.entryKind === 'commitment') {
        const item = await tx.commitment.findFirst({ where: visibleEntryWhere(householdId, userId, operation.entryId), select: { id: true, planAccountId: true } })
        if (!item) throw new Error('A proposed commitment is no longer available')
        if (account.visibility === 'PRIVATE' && item.planAccountId !== account.id) throw new Error('AI cannot make a shared entry private')
        await tx.commitment.update({ where: { id: item.id }, data: { planAccountId: account.id } })
      } else {
        const item = await tx.savingsGoal.findFirst({ where: visibleEntryWhere(householdId, userId, operation.entryId), select: { id: true, planAccountId: true } })
        if (!item) throw new Error('A proposed goal is no longer available')
        if (account.visibility === 'PRIVATE' && item.planAccountId !== account.id) throw new Error('AI cannot make a shared entry private')
        await tx.savingsGoal.update({ where: { id: item.id }, data: { planAccountId: account.id } })
      }
    } else if (operation.kind === 'set_account_type') {
      const account = accountById.get(operation.accountId)
      if (!account) throw new Error('A proposed planning account is no longer available')
      await tx.financePlanAccount.update({ where: { id: account.id }, data: { type: operation.accountType } })
    } else if (operation.kind === 'set_account_buffer') {
      const account = accountById.get(operation.accountId)
      if (!account) throw new Error('A proposed planning account is no longer available')
      await tx.financePlanAccount.update({ where: { id: account.id }, data: { monthlyBufferCents: operation.amountCents } })
    } else if (operation.kind === 'set_goal_contribution') {
      const goal = await tx.savingsGoal.findFirst({ where: visibleEntryWhere(householdId, userId, operation.goalId), select: { id: true } })
      if (!goal) throw new Error('A proposed goal is no longer available')
      await tx.savingsGoal.update({ where: { id: goal.id }, data: { monthlyContributionCents: operation.amountCents } })
    } else {
      const source = accountById.get(operation.sourceAccountId)
      const target = accountById.get(operation.targetAccountId)
      if (!source || !target || source.id === target.id) throw new Error('A proposed transfer is no longer valid')
      if (target.visibility === 'PRIVATE' && (source.visibility !== 'PRIVATE' || source.ownerUserId !== target.ownerUserId)) {
        throw new Error('AI cannot fund that private destination')
      }
      await tx.financeFundingRule.upsert({
        where: {
          sourceAccountId_targetAccountId: {
            sourceAccountId: source.id,
            targetAccountId: target.id,
          },
        },
        create: {
          householdId,
          sourceAccountId: source.id,
          targetAccountId: target.id,
          amountCents: operation.amountCents,
        },
        update: { amountCents: operation.amountCents, archivedAt: null },
      })
    }
  }
}
