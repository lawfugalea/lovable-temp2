export type FinancePlanAccountVisibility = 'SHARED' | 'PRIVATE'

/**
 * A savings pot. Nothing here records money moving — a balance the household stated,
 * and what they say they put in each month. Everything else is arithmetic on those two.
 */
export type SavingsAccount = {
  id: string
  name: string
  visibility: FinancePlanAccountVisibility
  openingBalanceCents: number
  openingBalanceAt: string | null
  monthlyContributionCents: number
  owned: boolean
  canEdit: boolean
  canManagePrivacy: boolean
}

/** A goal pointed at an account, drawn as a target line on that account's forecast. */
export type SavingsGoalMarker = {
  id: string
  name: string
  accountId: string
  targetCents: number
}

export type ForecastPoint = { period: string; cents: number }

/** The two preset horizons; anything else comes from the custom input. */
export const HORIZONS = [12, 24] as const
export const MAX_HORIZON_MONTHS = 120

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

/** Shifts a `YYYY-MM` period by whole months, rolling the year over. */
export function shiftPeriod(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number)
  const zeroBased = (year * 12 + (month - 1)) + months
  return `${String(Math.floor(zeroBased / 12)).padStart(4, '0')}-${String((zeroBased % 12) + 1).padStart(2, '0')}`
}

/** "2026-07" → "July 2026". */
export function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-MT', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function clampHorizon(months: number): number {
  if (!Number.isFinite(months)) return HORIZONS[0]
  return Math.min(MAX_HORIZON_MONTHS, Math.max(1, Math.round(months)))
}

/**
 * Balance today plus the monthly contribution, month by month. Point 0 is today, so a
 * 12-month view has 13 points and its last one is the answer to "where will I be in a year".
 */
export function projectAccount(
  account: Pick<SavingsAccount, 'openingBalanceCents' | 'monthlyContributionCents'>,
  months: number,
  fromPeriod = financePeriod(),
): ForecastPoint[] {
  const points: ForecastPoint[] = []
  for (let index = 0; index <= clampHorizon(months); index += 1) {
    points.push({
      period: shiftPeriod(fromPeriod, index),
      cents: account.openingBalanceCents + account.monthlyContributionCents * index,
    })
  }
  return points
}

/** The household line: every account added together, month by month. */
export function projectTotal(
  accounts: Array<Pick<SavingsAccount, 'openingBalanceCents' | 'monthlyContributionCents'>>,
  months: number,
  fromPeriod = financePeriod(),
): ForecastPoint[] {
  return projectAccount(
    {
      openingBalanceCents: accounts.reduce((sum, account) => sum + account.openingBalanceCents, 0),
      monthlyContributionCents: accounts.reduce((sum, account) => sum + account.monthlyContributionCents, 0),
    },
    months,
    fromPeriod,
  )
}

/**
 * How many months until the account clears the goal's target, or null when it never does —
 * either because nothing goes in, or because it lands beyond `withinMonths`.
 */
export function monthsUntilGoal(
  account: Pick<SavingsAccount, 'openingBalanceCents' | 'monthlyContributionCents'>,
  goal: Pick<SavingsGoalMarker, 'targetCents'>,
  withinMonths = MAX_HORIZON_MONTHS,
): number | null {
  const shortfall = goal.targetCents - account.openingBalanceCents
  if (shortfall <= 0) return 0
  if (account.monthlyContributionCents <= 0) return null
  const months = Math.ceil(shortfall / account.monthlyContributionCents)
  return months <= clampHorizon(withinMonths) ? months : null
}
