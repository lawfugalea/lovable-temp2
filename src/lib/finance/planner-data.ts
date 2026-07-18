import { prisma } from '@/lib/prisma'
import {
  buildGoalPlan,
  buildPlanSummary,
  type CommitmentEntry,
  type GoalPlan,
  type PlanSummary,
  type PlannerFrequency,
} from '@/lib/budget'

export interface PlannerData {
  incomes: Array<{ id: string; userId: string | null; label: string; amountCents: number; frequency: PlannerFrequency }>
  commitments: Array<CommitmentEntry & { userId: string | null }>
  goals: GoalPlan[]
  members: Array<{ userId: string; name: string }>
  summary: PlanSummary
}

export async function loadPlannerData(householdId: string, now = new Date()): Promise<PlannerData> {
  const [incomes, commitments, goals, members] = await Promise.all([
    prisma.incomeSource.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' } }),
    prisma.commitment.findMany({ where: { householdId }, orderBy: [{ essential: 'desc' }, { createdAt: 'asc' }] }),
    prisma.savingsGoal.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' } }),
    prisma.membership.findMany({
      where: { householdId },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
  ])

  const commitmentEntries = commitments.map(item => ({
    id: item.id,
    userId: item.userId,
    label: item.label,
    category: item.category,
    amountCents: item.amountCents,
    frequency: item.frequency as PlannerFrequency,
    essential: item.essential,
  }))
  const summary = buildPlanSummary(
    incomes.map(item => ({ amountCents: item.amountCents, frequency: item.frequency as PlannerFrequency })),
    commitmentEntries,
  )

  return {
    incomes: incomes.map(item => ({
      id: item.id,
      userId: item.userId,
      label: item.label,
      amountCents: item.amountCents,
      frequency: item.frequency as PlannerFrequency,
    })),
    commitments: commitmentEntries,
    goals: goals.map(goal =>
      buildGoalPlan(
        {
          id: goal.id,
          name: goal.name,
          targetCents: goal.targetCents,
          savedCents: goal.savedCents,
          targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
        },
        summary.disposableCents,
        now,
      ),
    ),
    members: members.map(member => ({ userId: member.userId, name: member.user.name || member.user.email })),
    summary,
  }
}
