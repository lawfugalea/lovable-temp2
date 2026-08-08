import { prisma } from '@/lib/prisma'
import {
  buildGoalPlan,
  buildPlanSummary,
  type CommitmentEntry,
  type GoalPlan,
  type PlanSummary,
  type PlannerFrequency,
} from '@/lib/budget'
import {
  buildMoneyFlow,
  financePeriod,
  type FinancePlanAccountType,
  type FinancePlanAccountVisibility,
  type MoneyFlowAccount,
  type MoneyFlowRuleInput,
  type MoneyFlowSummary,
} from './money-flow'

export interface PlannerData {
  incomes: Array<{ id: string; userId: string | null; label: string; amountCents: number; frequency: PlannerFrequency; planAccountId: string | null }>
  commitments: Array<CommitmentEntry & { userId: string | null; planAccountId: string | null }>
  goals: Array<GoalPlan & { planAccountId: string | null; monthlyContributionCents: number; monthlyContributionOverrideCents: number | null }>
  members: Array<{ userId: string; name: string }>
  summary: PlanSummary
  period: string
  accounts: MoneyFlowAccount[]
  fundingRules: MoneyFlowRuleInput[]
  moneyFlow: MoneyFlowSummary
}

export async function loadPlannerData(
  householdId: string,
  now = new Date(),
  viewerUserId?: string,
  requestedPeriod = financePeriod(now),
): Promise<PlannerData> {
  const [incomeRows, commitmentRows, goalRows, members, accountRows, ruleRows] = await Promise.all([
    prisma.incomeSource.findMany({
      where: { householdId },
      include: { planAccount: { select: { visibility: true, ownerUserId: true, archivedAt: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.commitment.findMany({
      where: { householdId },
      include: { planAccount: { select: { visibility: true, ownerUserId: true, archivedAt: true } } },
      orderBy: [{ essential: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.savingsGoal.findMany({
      where: { householdId },
      include: { planAccount: { select: { visibility: true, ownerUserId: true, archivedAt: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.membership.findMany({
      where: { householdId },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.financePlanAccount.findMany({
      where: { householdId, archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.financeFundingRule.findMany({
      where: {
        householdId,
        sourceAccount: { archivedAt: null },
        targetAccount: { archivedAt: null },
        OR: [
          { archivedAt: null },
          { checkoffs: { some: { period: requestedPeriod } } },
        ],
      },
      include: {
        sourceAccount: { select: { id: true, name: true, visibility: true, ownerUserId: true } },
        targetAccount: { select: { id: true, name: true, visibility: true, ownerUserId: true } },
        checkoffs: { where: { period: requestedPeriod }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const canSee = (account: { visibility: string; ownerUserId: string; archivedAt?: Date | null } | null) =>
    !account || (!account.archivedAt && (account.visibility === 'SHARED' || account.ownerUserId === viewerUserId))

  const incomes = incomeRows.filter(item => canSee(item.planAccount)).map(item => ({
    id: item.id,
    userId: item.userId,
    label: item.label,
    amountCents: item.amountCents,
    frequency: item.frequency as PlannerFrequency,
    planAccountId: item.planAccountId,
  }))
  const commitments = commitmentRows.filter(item => canSee(item.planAccount)).map(item => ({
    id: item.id,
    userId: item.userId,
    label: item.label,
    category: item.category,
    amountCents: item.amountCents,
    frequency: item.frequency as PlannerFrequency,
    essential: item.essential,
    planAccountId: item.planAccountId,
  }))
  const summary = buildPlanSummary(incomes, commitments)
  const goals = goalRows.filter(item => canSee(item.planAccount)).map(item => {
    const goal = buildGoalPlan(
      {
        id: item.id,
        name: item.name,
        targetCents: item.targetCents,
        savedCents: item.savedCents,
        targetDate: item.targetDate ? item.targetDate.toISOString().slice(0, 10) : null,
      },
      summary.disposableCents,
      now,
    )
    return {
      ...goal,
      planAccountId: item.planAccountId,
      monthlyContributionOverrideCents: item.monthlyContributionCents,
      monthlyContributionCents: item.monthlyContributionCents ?? goal.requiredMonthlyCents ?? 0,
    }
  })

  const accounts = accountRows
    .filter(account => account.visibility === 'SHARED' || account.ownerUserId === viewerUserId)
    .map(account => ({
      id: account.id,
      name: account.name,
      type: account.type as FinancePlanAccountType,
      visibility: account.visibility as FinancePlanAccountVisibility,
      monthlyBufferCents: account.monthlyBufferCents,
      owned: account.ownerUserId === viewerUserId,
      canEdit: account.visibility === 'SHARED' || account.ownerUserId === viewerUserId,
      canManagePrivacy: account.ownerUserId === viewerUserId,
    }))

  const visibleAccountIds = new Set(accounts.map(account => account.id))
  const fundingRules: MoneyFlowRuleInput[] = ruleRows
    .filter(rule => visibleAccountIds.has(rule.targetAccountId))
    .map(rule => {
      const sourceVisible = visibleAccountIds.has(rule.sourceAccountId)
      const checkoff = rule.checkoffs[0]
      const sourceCanManage = rule.sourceAccount.visibility === 'SHARED' || rule.sourceAccount.ownerUserId === viewerUserId
      return {
        id: rule.id,
        sourceAccountId: sourceVisible ? rule.sourceAccountId : null,
        sourceName: sourceVisible ? rule.sourceAccount.name : 'Private contribution',
        sourcePrivate: rule.sourceAccount.visibility === 'PRIVATE',
        targetAccountId: rule.targetAccountId,
        targetName: rule.targetAccount.name,
        amountCents: checkoff?.amountCents ?? rule.amountCents,
        completed: Boolean(checkoff),
        completedAt: checkoff?.completedAt.toISOString() ?? null,
        canComplete: !rule.archivedAt && sourceCanManage,
        canEdit: !rule.archivedAt && sourceCanManage,
      }
    })

  const moneyFlow = buildMoneyFlow(
    accounts,
    incomes,
    commitments,
    goals.map(goal => ({ planAccountId: goal.planAccountId, monthlyContributionCents: goal.monthlyContributionCents })),
    fundingRules,
  )

  return {
    incomes,
    commitments,
    goals,
    members: members.map(member => ({ userId: member.userId, name: member.user.name || member.user.email })),
    summary,
    period: requestedPeriod,
    accounts: moneyFlow.accounts,
    fundingRules,
    moneyFlow,
  }
}
