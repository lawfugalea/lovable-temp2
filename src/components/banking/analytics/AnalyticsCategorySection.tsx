/**
 * Where the money went, by category.
 *
 * Shares come from the server and are rendered as given. Sorting by change puts
 * brand-new categories at the top rather than collapsing their "no comparison"
 * into a 0% that sorts them into the middle.
 */
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { colorForCategory, groupTail, OTHER_COLOR, ShareBars, type ShareRow } from '@/components/charts'
import { money, percent, signedMoney } from '@/lib/finance/format'
import type { CategoryStat } from '@/lib/finance/analytics-types'

export type CategorySort = 'amount' | 'count' | 'change' | 'name'
export type SortDirection = 'asc' | 'desc'

export type AnalyticsCategorySectionProps = {
  categories: CategoryStat[]
  /** False when the bank's history does not reach the comparison window. */
  comparable: boolean
  periodDays: number
  currency: string
  selected: string
  sort: CategorySort
  direction: SortDirection
  onSelect: (category: string) => void
  onSort: (sort: CategorySort, direction: SortDirection) => void
}

const BASE_COLUMNS: Array<{ key: CategorySort; label: string; align: 'left' | 'right' }> = [
  { key: 'name', label: 'Category', align: 'left' },
  { key: 'amount', label: 'Total', align: 'right' },
  { key: 'count', label: 'Payments', align: 'right' },
]
const CHANGE_COLUMN = { key: 'change' as CategorySort, label: 'vs before', align: 'right' as const }

function sortCategories(categories: CategoryStat[], sort: CategorySort, direction: SortDirection): CategoryStat[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...categories].sort((left, right) => {
    if (sort === 'name') return factor * left.category.localeCompare(right.category)
    if (sort === 'count') return factor * (left.count - right.count)
    if (sort === 'change') {
      // A category with no prior period has no percentage; keep those together at
      // the end rather than pretending they changed by nothing.
      const leftNull = left.changePercent === null
      const rightNull = right.changePercent === null
      if (leftNull !== rightNull) return leftNull ? 1 : -1
      return factor * ((left.changePercent ?? 0) - (right.changePercent ?? 0))
    }
    return factor * (left.amountCents - right.amountCents)
  })
}

export function AnalyticsCategorySection({
  categories,
  comparable,
  periodDays,
  currency,
  selected,
  sort,
  direction,
  onSelect,
  onSort,
}: AnalyticsCategorySectionProps) {
  const spending = categories.filter(category => category.amountCents > 0)
  const { rows: head, tail } = groupTail(
    spending.map(category => ({
      category: category.category,
      amountCents: category.amountCents,
      sharePercent: category.sharePercent,
      count: category.count,
    })),
  )

  const shareRows: ShareRow[] = [
    ...head.map(row => ({
      key: row.category,
      label: row.category,
      cents: row.amountCents,
      sharePercent: row.sharePercent,
      count: row.count,
      color: colorForCategory(row.category),
      selected: selected === row.category,
      onSelect: () => onSelect(selected === row.category ? '' : row.category),
    })),
    ...(tail ? [{
      key: '__tail__',
      label: tail.label,
      cents: tail.amountCents,
      sharePercent: tail.sharePercent,
      count: tail.count,
      color: OTHER_COLOR,
    }] : []),
  ]

  // With no comparable window the column would be a wall of "New" and a couple of
  // four-figure percentages, all of them artefacts of missing history rather than
  // anything that happened. Drop the column instead of qualifying every cell.
  const columns = comparable ? [...BASE_COLUMNS, CHANGE_COLUMN] : BASE_COLUMNS
  const sorted = sortCategories(categories, comparable ? sort : 'amount', direction)

  return (
    <Card className="hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="text-xl">Where it went</CardTitle>
        <CardDescription>
          Share of money out. Transfers between your own accounts are not counted as spending.
          {!comparable && ` There is no comparable ${periodDays}-day period before this one, so nothing is compared.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ShareBars rows={shareRows} currency={currency} emptyMessage="No spending in this period." />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">
              Spending by category{comparable ? ', with the previous period for comparison' : ''}
            </caption>
            <thead className="border-b border-border">
              <tr>
                {columns.map(column => {
                  const active = sort === column.key
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`py-2 font-medium ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        onClick={() => onSort(column.key, active && direction === 'desc' ? 'asc' : 'desc')}
                        className="inline-flex items-center gap-1 rounded px-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {column.label}
                        {active && (direction === 'asc'
                          ? <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map(category => (
                <tr
                  key={category.category}
                  className={`border-b border-border/60 last:border-0 ${selected === category.category ? 'bg-secondary/60' : ''}`}
                >
                  <th scope="row" className="py-2.5 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => onSelect(selected === category.category ? '' : category.category)}
                      aria-pressed={selected === category.category}
                      className="flex items-center gap-2 rounded px-1 font-medium transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorForCategory(category.category) }}
                        aria-hidden="true"
                      />
                      {category.category}
                    </button>
                  </th>
                  <td className="py-2.5 text-right tabular-nums">{money(category.amountCents, { currency })}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{category.count}</td>
                  {comparable && <td className="py-2.5 text-right tabular-nums">
                    {category.changePercent === null ? (
                      <span className="text-muted-foreground">
                        {category.previousAmountCents === 0 && category.amountCents > 0 ? 'New' : '—'}
                      </span>
                    ) : (
                      <span className={category.changeCents > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}>
                        {percent(category.changePercent, { sign: true })}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {signedMoney(category.changeCents, currency)}
                        </span>
                      </span>
                    )}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
