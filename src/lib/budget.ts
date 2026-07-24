// Pure money-planner math. All amounts are integer cents; monthly figures are
// rounded to the nearest cent only at the end of each calculation.

export type PlannerFrequency =
  | 'WEEKLY'
  | 'FOUR_WEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL'

export const PLANNER_FREQUENCIES: PlannerFrequency[] = [
  'WEEKLY',
  'FOUR_WEEKLY',
  'MONTHLY',
  'BIMONTHLY',
  'QUARTERLY',
  'ANNUAL',
]

export const FREQUENCY_LABELS: Record<PlannerFrequency, string> = {
  WEEKLY: 'Weekly',
  FOUR_WEEKLY: 'Every 4 weeks',
  MONTHLY: 'Monthly',
  BIMONTHLY: 'Every 2 months',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Yearly',
}

/** Occurrences per year for each frequency (52-week year convention). */
const PER_YEAR: Record<PlannerFrequency, number> = {
  WEEKLY: 52,
  FOUR_WEEKLY: 13,
  MONTHLY: 12,
  BIMONTHLY: 6,
  QUARTERLY: 4,
  ANNUAL: 1,
}

export const COMMITMENT_CATEGORIES = [
  { key: 'housing', label: 'Housing' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'loans', label: 'Loans & cards' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'transport', label: 'Transport' },
  { key: 'education', label: 'School & childcare' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'health', label: 'Health' },
  { key: 'food', label: 'Food budget' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'other', label: 'Other' },
] as const

export type CommitmentCategoryKey = (typeof COMMITMENT_CATEGORIES)[number]['key']

export function isCommitmentCategory(value: string): value is CommitmentCategoryKey {
  return COMMITMENT_CATEGORIES.some((category) => category.key === value)
}

export interface PlannerEntry {
  amountCents: number
  frequency: PlannerFrequency
}

export interface CommitmentEntry extends PlannerEntry {
  id: string
  label: string
  category: string
  essential: boolean
  /** Whether the household puts money aside monthly for this commitment. */
  setAside: boolean
}

/**
 * Whether to offer a set-aside by default for a new commitment. Bills that are
 * not billed monthly or weekly are the usual candidates to save up for, but the
 * household always has the final say.
 */
export function suggestsSetAside(frequency: PlannerFrequency): boolean {
  return frequency !== 'MONTHLY' && frequency !== 'WEEKLY'
}

export interface GoalEntry {
  id: string
  name: string
  targetCents: number
  savedCents: number
  /** ISO date (YYYY-MM-DD) or null when the goal has no deadline. */
  targetDate: string | null
}

export function monthlyCents(entry: PlannerEntry): number {
  if (!Number.isFinite(entry.amountCents) || entry.amountCents <= 0) return 0
  return Math.round((entry.amountCents * PER_YEAR[entry.frequency]) / 12)
}

export interface SetAside {
  id: string
  label: string
  category: string
  frequency: PlannerFrequency
  amountCents: number
  monthlyCents: number
}

export interface CategoryTotal {
  category: string
  monthlyCents: number
  essentialCents: number
}

export interface PlanSummary {
  monthlyIncomeCents: number
  monthlyCommitmentsCents: number
  essentialCents: number
  lifestyleCents: number
  disposableCents: number
  /** Disposable divided across 52/12 weeks. */
  safeToSpendWeeklyCents: number
  /** Commitments as a share of income, 0..1; null when income is zero. */
  commitmentRatio: number | null
  categories: CategoryTotal[]
  /** Commitments the household saves up for, as monthly slices. */
  setAsides: SetAside[]
}

export function buildPlanSummary(incomes: PlannerEntry[], commitments: CommitmentEntry[]): PlanSummary {
  const monthlyIncomeCents = incomes.reduce((total, income) => total + monthlyCents(income), 0)

  const categoryTotals = new Map<string, CategoryTotal>()
  let monthlyCommitmentsCents = 0
  let essentialCents = 0
  const setAsides: SetAside[] = []

  for (const commitment of commitments) {
    const monthly = monthlyCents(commitment)
    monthlyCommitmentsCents += monthly
    if (commitment.essential) essentialCents += monthly

    const bucket = categoryTotals.get(commitment.category) ?? {
      category: commitment.category,
      monthlyCents: 0,
      essentialCents: 0,
    }
    bucket.monthlyCents += monthly
    if (commitment.essential) bucket.essentialCents += monthly
    categoryTotals.set(commitment.category, bucket)

    if (commitment.setAside && monthly > 0) {
      setAsides.push({
        id: commitment.id,
        label: commitment.label,
        category: commitment.category,
        frequency: commitment.frequency,
        amountCents: commitment.amountCents,
        monthlyCents: monthly,
      })
    }
  }

  const disposableCents = monthlyIncomeCents - monthlyCommitmentsCents
  return {
    monthlyIncomeCents,
    monthlyCommitmentsCents,
    essentialCents,
    lifestyleCents: monthlyCommitmentsCents - essentialCents,
    disposableCents,
    safeToSpendWeeklyCents: disposableCents > 0 ? Math.floor(disposableCents / (52 / 12)) : 0,
    commitmentRatio: monthlyIncomeCents > 0 ? monthlyCommitmentsCents / monthlyIncomeCents : null,
    categories: [...categoryTotals.values()].sort((a, b) => b.monthlyCents - a.monthlyCents),
    setAsides: setAsides.sort((a, b) => b.monthlyCents - a.monthlyCents),
  }
}

export interface GoalPlan extends GoalEntry {
  remainingCents: number
  progress: number
  /** Months until targetDate from `now`; null without a deadline. */
  monthsRemaining: number | null
  /** Cents/month needed to reach the target by the deadline; null without one. */
  requiredMonthlyCents: number | null
  /** Whether the deadline is achievable within the household's disposable income. */
  achievable: boolean | null
}

export function buildGoalPlan(goal: GoalEntry, disposableCents: number, now: Date): GoalPlan {
  const remainingCents = Math.max(0, goal.targetCents - goal.savedCents)
  const progress = goal.targetCents > 0 ? Math.min(1, goal.savedCents / goal.targetCents) : 0

  let monthsRemaining: number | null = null
  let requiredMonthlyCents: number | null = null
  let achievable: boolean | null = null

  if (goal.targetDate) {
    const target = new Date(`${goal.targetDate}T12:00:00.000Z`)
    const months =
      (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + (target.getUTCMonth() - now.getUTCMonth())
    monthsRemaining = Math.max(0, months)
    requiredMonthlyCents = remainingCents === 0
      ? 0
      : monthsRemaining === 0
        ? remainingCents
        : Math.ceil(remainingCents / monthsRemaining)
    achievable = requiredMonthlyCents <= Math.max(0, disposableCents)
  }

  return { ...goal, remainingCents, progress, monthsRemaining, requiredMonthlyCents, achievable }
}

/** Standard advice: an emergency fund covering three months of commitments. */
export function suggestedEmergencyFundCents(summary: PlanSummary): number {
  return summary.monthlyCommitmentsCents * 3
}

/** Comfort guidance for the commitments-to-income ratio. */
export function commitmentRatioBand(ratio: number | null): 'unknown' | 'comfortable' | 'stretched' | 'overcommitted' {
  if (ratio === null) return 'unknown'
  if (ratio <= 0.6) return 'comfortable'
  if (ratio <= 0.8) return 'stretched'
  return 'overcommitted'
}

export function isPlannerFrequency(value: string): value is PlannerFrequency {
  return (PLANNER_FREQUENCIES as string[]).includes(value)
}

/** Parses a user-supplied euro amount ("1,234.56") into cents; null when invalid. */
export function parseAmountToCents(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null
    return Math.round(value * 100)
  }
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[€\s,]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10_000_000) return null
  return Math.round(parsed * 100)
}
