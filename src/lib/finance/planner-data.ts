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
  financePeriod,
  type FinancePlanAccountVisibility,
  type SavingsAccount,
  type SavingsGoalMarker,
} from './savings'

export interface PlannerData {
  incomes: Array<{ id: string; userId: string | null; label: string; amountCents: number; frequency: PlannerFrequency }>
  commitments: Array<CommitmentEntry & { userId: string | null }>
  goals: Array<GoalPlan & { planAccountId: string | null; monthlyContributionCents: number; monthlyContributionOverrideCents: number | null }>
  members: Array<{ userId: string; name: string }>
  summary: PlanSummary
  period: string
  accounts: SavingsAccount[]
  goalMarkers: SavingsGoalMarker[]
}

export async function loadPlannerData(
  householdId: string,
  now = new Date(),
  viewerUserId?: string,
): Promise<PlannerData> {
  const [incomeRows, commitmentRows, goalRows, members, accountRows] = await Promise.all([
    prisma.incomeSource.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.commitment.findMany({
      where: { householdId },
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
  ])

  const canSee = (account: { visibility: string; ownerUserId: string; archivedAt?: Date | null } | null) =>
    !account || (!account.archivedAt && (account.visibility === 'SHARED' || account.ownerUserId === viewerUserId))

  const incomes = incomeRows.map(item => ({
    id: item.id,
    userId: item.userId,
    label: item.label,
    amountCents: item.amountCents,
    frequency: item.frequency as PlannerFrequency,
  }))
  const commitments = commitmentRows.map(item => ({
    id: item.id,
    userId: item.userId,
    label: item.label,
    category: item.category,
    amountCents: item.amountCents,
    frequency: item.frequency as PlannerFrequency,
    essential: item.essential,
    setAside: item.setAside,
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

  const accounts: SavingsAccount[] = accountRows
    .filter(account => account.visibility === 'SHARED' || account.ownerUserId === viewerUserId)
    .map(account => ({
      id: account.id,
      name: account.name,
      visibility: account.visibility as FinancePlanAccountVisibility,
      openingBalanceCents: account.openingBalanceCents,
      openingBalanceAt: account.openingBalanceAt ? account.openingBalanceAt.toISOString().slice(0, 10) : null,
      monthlyContributionCents: account.monthlyContributionCents,
      owned: account.ownerUserId === viewerUserId,
      canEdit: account.visibility === 'SHARED' || account.ownerUserId === viewerUserId,
      canManagePrivacy: account.ownerUserId === viewerUserId,
    }))

  // Goals only mark a target on the account they point at; their contributions are never
  // added to it, or a €200/mo account holding a €100/mo goal would forecast €300/mo.
  const visibleAccountIds = new Set(accounts.map(account => account.id))
  const goalMarkers: SavingsGoalMarker[] = goals
    .filter(goal => goal.planAccountId && visibleAccountIds.has(goal.planAccountId) && goal.targetCents > 0)
    .map(goal => ({
      id: goal.id,
      name: goal.name,
      accountId: goal.planAccountId!,
      targetCents: goal.targetCents,
    }))

  return {
    incomes,
    commitments,
    goals,
    members: members.map(member => ({ userId: member.userId, name: member.user.name || member.user.email })),
    summary,
    period: financePeriod(now),
    accounts,
    goalMarkers,
  }
}
