/**
 * Colours for charts.
 *
 * Keyed by category *name*, never by position. The old panels indexed a hex list
 * by rank in an amount-sorted array, so a category changed colour whenever its
 * spending rank changed, and the same category was a different colour on two
 * tabs of the same page.
 *
 * There are sixteen categories and eight distinguishable hues, so the eight most
 * common spending categories hold the ramp, the three flow categories use their
 * semantic tokens, and the long tail shares a grey that {@link groupTail} folds
 * into a single "Other" row.
 */
import type { FinanceCategory } from '../../lib/finance/enrichment'

export const OTHER_COLOR = 'hsl(var(--chart-other))'

const CATEGORY_COLOR: Partial<Record<FinanceCategory, string>> = {
  Groceries: 'hsl(var(--chart-1))',
  Dining: 'hsl(var(--chart-2))',
  Transport: 'hsl(var(--chart-3))',
  'Bills & utilities': 'hsl(var(--chart-4))',
  Shopping: 'hsl(var(--chart-5))',
  Entertainment: 'hsl(var(--chart-6))',
  Health: 'hsl(var(--chart-7))',
  Housing: 'hsl(var(--chart-8))',
  Income: 'hsl(var(--chart-income))',
  Refunds: 'hsl(var(--chart-income))',
  Transfers: 'hsl(var(--chart-internal))',
}

export function colorForCategory(category: string): string {
  return CATEGORY_COLOR[category as FinanceCategory] ?? OTHER_COLOR
}

export type SeriesKind = 'income' | 'spending' | 'internal' | 'projected' | 'over' | 'total'

const SERIES_COLOR: Record<SeriesKind, string> = {
  income: 'hsl(var(--chart-income))',
  spending: 'hsl(var(--chart-spending))',
  internal: 'hsl(var(--chart-internal))',
  projected: 'hsl(var(--chart-projected))',
  over: 'hsl(var(--chart-over))',
  total: 'hsl(var(--module-finances))',
}

export function colorForSeries(kind: SeriesKind): string {
  return SERIES_COLOR[kind]
}

export type TailGroupable = { category: string; amountCents: number; sharePercent: number }

export type TailGroup<T> = {
  rows: T[]
  tail: { label: string; amountCents: number; sharePercent: number; count: number; members: T[] } | null
}

/**
 * Keep the largest rows and fold the rest into one entry.
 *
 * Sums come from the server's own figures; nothing here divides, so a grouped
 * row cannot disagree with the category it came from.
 */
export function groupTail<T extends TailGroupable>(rows: readonly T[], keep = 7): TailGroup<T> {
  if (rows.length <= keep + 1) return { rows: [...rows], tail: null }
  const head = rows.slice(0, keep)
  const rest = rows.slice(keep)
  return {
    rows: head,
    tail: {
      label: `${rest.length} smaller categories`,
      amountCents: rest.reduce((total, row) => total + row.amountCents, 0),
      sharePercent: Math.round(rest.reduce((total, row) => total + row.sharePercent, 0) * 10) / 10,
      count: rest.length,
      members: rest,
    },
  }
}
