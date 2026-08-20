import type { PlannerFrequency } from '../budget'
import { monthlyCents } from '../budget'

export const FINANCE_PLAN_ACCOUNT_TYPES = [
  'PERSONAL',
  'HOUSEHOLD_SPENDING',
  'COMMITMENTS',
  'SAVINGS',
  'OTHER',
] as const
export type FinancePlanAccountType = (typeof FINANCE_PLAN_ACCOUNT_TYPES)[number]
export type FinancePlanAccountVisibility = 'SHARED' | 'PRIVATE'

export type MoneyFlowAccountInput = {
  id: string
  name: string
  type: FinancePlanAccountType
  visibility: FinancePlanAccountVisibility
  monthlyBufferCents: number
  owned: boolean
  canEdit: boolean
  canManagePrivacy: boolean
}

export type MoneyFlowEntryInput = {
  planAccountId: string | null
  amountCents: number
  frequency: PlannerFrequency
}

export type MoneyFlowGoalInput = {
  planAccountId: string | null
  monthlyContributionCents: number
}

export type MoneyFlowRuleInput = {
  id: string
  sourceAccountId: string | null
  sourceName: string
  sourcePrivate: boolean
  targetAccountId: string
  targetName: string
  amountCents: number
  completed: boolean
  completedAt: string | null
  canComplete: boolean
  canEdit: boolean
}

export type MoneyFlowAccount = MoneyFlowAccountInput & {
  monthlyIncomeCents: number
  monthlyCommitmentsCents: number
  monthlyGoalsCents: number
  incomingTransfersCents: number
  outgoingTransfersCents: number
  monthlyNeedCents: number
  monthlyInflowCents: number
  remainingCents: number
  weeklySpendingCents: number | null
}

export type MoneyFlowSummary = {
  monthlyIncomeCents: number
  monthlyCommitmentsCents: number
  monthlyGoalsCents: number
  monthlyBuffersCents: number
  plannedAllocationCents: number
  unallocatedCents: number
  accounts: MoneyFlowAccount[]
}

export function isFinancePlanAccountType(value: unknown): value is FinancePlanAccountType {
  return typeof value === 'string' && (FINANCE_PLAN_ACCOUNT_TYPES as readonly string[]).includes(value)
}

export function isFinancePlanAccountVisibility(value: unknown): value is FinancePlanAccountVisibility {
  return value === 'SHARED' || value === 'PRIVATE'
}

export function financePeriod(date = new Date(), timeZone = 'Europe/Malta'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  return year && month ? `${year}-${month}` : date.toISOString().slice(0, 7)
}

export function isFinancePeriod(value: unknown): value is string {
  return typeof value === 'string' && /^(?:20\d{2}|2100)-(?:0[1-9]|1[0-2])$/.test(value)
}

export function buildMoneyFlow(
  accounts: MoneyFlowAccountInput[],
  incomes: MoneyFlowEntryInput[],
  commitments: MoneyFlowEntryInput[],
  goals: MoneyFlowGoalInput[],
  rules: MoneyFlowRuleInput[],
): MoneyFlowSummary {
  const accountById = new Map(accounts.map(account => [account.id, {
    ...account,
    monthlyIncomeCents: 0,
    monthlyCommitmentsCents: 0,
    monthlyGoalsCents: 0,
    incomingTransfersCents: 0,
    outgoingTransfersCents: 0,
    monthlyNeedCents: 0,
    monthlyInflowCents: 0,
    remainingCents: 0,
    weeklySpendingCents: null as number | null,
  }]))

  for (const income of incomes) {
    if (income.planAccountId) {
      const account = accountById.get(income.planAccountId)
      if (account) account.monthlyIncomeCents += monthlyCents(income)
    }
  }
  for (const commitment of commitments) {
    if (commitment.planAccountId) {
      const account = accountById.get(commitment.planAccountId)
      if (account) account.monthlyCommitmentsCents += monthlyCents(commitment)
    }
  }
  for (const goal of goals) {
    if (goal.planAccountId) {
      const account = accountById.get(goal.planAccountId)
      if (account) account.monthlyGoalsCents += Math.max(0, goal.monthlyContributionCents)
    }
  }
  for (const rule of rules) {
    const target = accountById.get(rule.targetAccountId)
    if (target) target.incomingTransfersCents += rule.amountCents
    if (rule.sourceAccountId) {
      const source = accountById.get(rule.sourceAccountId)
      if (source) source.outgoingTransfersCents += rule.amountCents
    }
  }

  const result = accounts.map(base => {
    const account = accountById.get(base.id)!
    account.monthlyNeedCents =
      account.monthlyBufferCents + account.monthlyCommitmentsCents + account.monthlyGoalsCents
    account.monthlyInflowCents = account.monthlyIncomeCents + account.incomingTransfersCents
    account.remainingCents =
      account.monthlyInflowCents - account.monthlyNeedCents - account.outgoingTransfersCents
    account.weeklySpendingCents = account.type === 'HOUSEHOLD_SPENDING'
      ? Math.floor(account.monthlyNeedCents / (52 / 12))
      : null
    return account
  })

  const monthlyIncomeCents = incomes.reduce((total, item) => total + monthlyCents(item), 0)
  const monthlyCommitmentsCents = commitments.reduce((total, item) => total + monthlyCents(item), 0)
  const monthlyGoalsCents = goals.reduce((total, item) => total + Math.max(0, item.monthlyContributionCents), 0)
  const monthlyBuffersCents = accounts.reduce((total, item) => total + Math.max(0, item.monthlyBufferCents), 0)
  const plannedAllocationCents = monthlyCommitmentsCents + monthlyGoalsCents + monthlyBuffersCents
  return {
    monthlyIncomeCents,
    monthlyCommitmentsCents,
    monthlyGoalsCents,
    monthlyBuffersCents,
    plannedAllocationCents,
    unallocatedCents: monthlyIncomeCents - plannedAllocationCents,
    accounts: result,
  }
}
