import type { GoalPlan, PlanSummary, PlannerFrequency } from '@/lib/budget'

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
}

export interface PlannerData {
  members: PlannerMember[]
  incomes: PlannerIncome[]
  commitments: PlannerCommitment[]
  goals: GoalPlan[]
  summary: PlanSummary
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
