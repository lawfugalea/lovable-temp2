import type { GoalPlan, PlanSummary, PlannerFrequency } from '@/lib/budget'
import type { SavingsAccount, SavingsGoalMarker } from '@/lib/finance/savings'

export interface PlannerMember {
  userId: string
  name: string
}

export interface PlannerIncome {
  id: string
  userId: string | null
  label: string
  amountCents: number
  frequency: PlannerFrequency
}

export interface PlannerCommitment {
  id: string
  userId: string | null
  label: string
  category: string
  amountCents: number
  frequency: PlannerFrequency
  essential: boolean
  setAside: boolean
}

export interface PlannerData {
  members: PlannerMember[]
  incomes: PlannerIncome[]
  commitments: PlannerCommitment[]
  goals: Array<GoalPlan & { planAccountId: string | null; monthlyContributionCents: number; monthlyContributionOverrideCents: number | null }>
  summary: PlanSummary
  period: string
  accounts: SavingsAccount[]
  goalMarkers: SavingsGoalMarker[]
  suggestedEmergencyFundCents: number
  aiConfigured: boolean
  bankEnabled: boolean
}

export function euros(cents: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: Math.abs(cents) % 100 === 0 ? 0 : 2,
    ...options,
  }).format(cents / 100)
}
