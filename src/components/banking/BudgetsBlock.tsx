/**
 * Progress against the household's monthly limits.
 *
 * A projection only appears once a week of the month has passed. Scaling a few
 * days of spending up to a month produces a confident-looking number built on
 * almost nothing, which is worse than saying nothing.
 */
import Link from 'next/link'
import { Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { colorForSeries } from '@/components/charts'
import { money, monthLabel, percent } from '@/lib/finance/format'
import type { BudgetProgress } from '@/lib/finance/analytics-types'

export type BudgetsBlockProps = {
  budgets: BudgetProgress[]
  currency: string
  canManage: boolean
  month: string
}

export function BudgetsBlock({ budgets, currency, canManage, month }: BudgetsBlockProps) {
  return (
    <Card className="h-full hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Gauge className="h-5 w-5 text-module-finances" aria-hidden="true" />
          Spending limits
        </CardTitle>
        <CardDescription>Where you stand in {monthLabel(month, true)}.</CardDescription>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <EmptyState
            icon={Gauge}
            module="banking"
            title="No spending limits yet"
            description="Set a monthly limit on a category or a merchant and it becomes a bar you can trust."
            action={canManage
              ? <Button asChild size="sm" variant="outline"><Link href="/banking?tab=coach">Set a limit</Link></Button>
              : undefined}
            className="border-0 bg-transparent px-0 py-8"
          />
        ) : (
          <ul className="space-y-4">
            {budgets.map((budget, index) => {
              const used = Math.min(100, budget.percentage)
              const projectedShare = budget.projectedCents === null
                ? null
                : Math.min(100, (budget.projectedCents / Math.max(1, budget.limitCents)) * 100)
              return (
                <li key={budget.id} className="animate-rise" style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{budget.displayName}</p>
                    <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      <span className={budget.exceeded ? 'font-semibold text-red-700 dark:text-red-300' : 'font-semibold text-foreground'}>
                        {money(budget.spentCents, { currency })}
                      </span>
                      {' of '}{money(budget.limitCents, { currency })}
                    </p>
                  </div>
                  <div
                    className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(budget.percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${budget.displayName}: ${money(budget.spentCents, { currency })} of ${money(budget.limitCents, { currency })}`}
                  >
                    {projectedShare !== null && projectedShare > used && (
                      <span
                        className="absolute inset-y-0 left-0 rounded-full opacity-30 transition-[width] duration-700 ease-out"
                        style={{ width: `${projectedShare}%`, backgroundColor: colorForSeries('projected') }}
                      />
                    )}
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${Math.max(2, used)}%`,
                        backgroundColor: budget.exceeded ? colorForSeries('over') : colorForSeries('spending'),
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {percent(budget.percentage)} used
                    {budget.exceeded && <span className="font-medium text-red-700 dark:text-red-300"> · over the limit</span>}
                    {!budget.exceeded && budget.projectedCents !== null && (
                      <> · on track for {money(budget.projectedCents, { currency })} by month end</>
                    )}
                    {budget.projectionBasis === 'INSUFFICIENT_DATA' && (
                      <> · too early in the month to project</>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
