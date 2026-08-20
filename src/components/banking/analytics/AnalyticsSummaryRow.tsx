/**
 * The headline figures.
 *
 * Six tiles rather than four, because the ones that were missing are the ones
 * that make the others honest: what came back as refunds, how much of the period
 * actually has data behind it, and the fact that net moved by an amount rather
 * than by a percentage that means nothing when it crosses zero.
 */
import { Card, CardContent } from '@/components/ui/Card'
import { comparisonLabel, money, netChangeLabel, percent } from '@/lib/finance/format'
import { useCountUp } from '@/hooks/useCountUp'
import type { CoverageInfo, MoneyFlowSummary } from '@/lib/finance/analytics-types'

type Tile = {
  label: string
  cents: number
  hint: string
  tone?: 'positive' | 'negative'
}

function SummaryTile({ tile, currency, index }: { tile: Tile; currency: string; index: number }) {
  const value = useCountUp(tile.cents)
  return (
    <Card
      className="instrument-grid group relative animate-rise overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow-module"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      {/* A sliver of light along the top edge, in the tile's own tone. */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${
          tile.tone === 'positive'
            ? 'via-brand-green'
            : tile.tone === 'negative'
              ? 'via-brand-coral'
              : 'via-module-finances'
        }`}
      />
      <CardContent className="relative p-5">
        <p className="text-sm text-muted-foreground">{tile.label}</p>
        <p
          className={`font-display text-2xl font-bold tabular-nums ${
            tile.tone === 'positive'
              ? 'text-green-700 dark:text-green-300'
              : tile.tone === 'negative'
                ? 'text-red-700 dark:text-red-300'
                : 'text-foreground'
          }`}
        >
          {money(value, { currency })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
      </CardContent>
    </Card>
  )
}

export type AnalyticsSummaryRowProps = {
  summary: MoneyFlowSummary
  coverage: CoverageInfo
  currency: string
  periodDays: number
}

export function AnalyticsSummaryRow({ summary, coverage, currency, periodDays }: AnalyticsSummaryRowProps) {
  // A comparison against a window the bank never gave us data for is worse than
  // no comparison. Note this turns on whether the *previous* period is covered,
  // which fails long before the current one does.
  const noComparison = `Your bank's history doesn't reach back another ${periodDays} days`
  const spendingHint = coverage.previousCovered
    ? comparisonLabel(summary.comparison.spendingChangePercent, periodDays)
    : noComparison
  const incomeHint = coverage.previousCovered
    ? comparisonLabel(summary.comparison.incomeChangePercent, periodDays)
    : noComparison

  const tiles: Tile[] = [
    { label: 'Money in', cents: summary.incomeCents, hint: incomeHint },
    {
      label: 'Money out',
      cents: summary.netSpendingCents,
      hint: summary.refundsCents > 0
        ? `${money(summary.spendingCents, { currency })} spent, ${money(summary.refundsCents, { currency })} refunded`
        : spendingHint,
    },
    {
      label: 'Net',
      cents: summary.netCents,
      hint: coverage.previousCovered
        ? netChangeLabel(summary.comparison.netChangeCents, summary.comparison.netDirection, currency)
        : noComparison,
      tone: summary.netCents >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Typical day',
      cents: summary.averageSpendPerDayCents,
      hint: coverage.complete
        ? `Across all ${coverage.periodDays} days`
        : `Across the ${coverage.coveredDays} days with data`,
    },
    {
      label: 'Typical payment',
      cents: summary.averageSpendPerTransactionCents,
      hint: `${summary.counts.spending} payment${summary.counts.spending === 1 ? '' : 's'} of ${summary.counts.total} entries`,
    },
    { label: 'Largest single expense', cents: summary.largestExpenseCents, hint: 'In this period' },
  ]

  return (
    <section aria-labelledby="analytics-summary" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="analytics-summary" className="font-display text-xl font-semibold tracking-tight">
          The last {periodDays} days
        </h2>
        {summary.savingsRatePercent !== null && (
          <p className="text-sm text-muted-foreground">
            {summary.savingsRatePercent >= 0 ? (
              <>
                You kept{' '}
                <span className="font-semibold tabular-nums text-foreground">
                  {percent(summary.savingsRatePercent, { decimals: 1 })}
                </span>{' '}
                of what came in
              </>
            ) : (
              <>
                You spent{' '}
                <span className="font-semibold tabular-nums text-foreground">
                  {percent(Math.abs(summary.savingsRatePercent), { decimals: 1 })}
                </span>{' '}
                more than came in
              </>
            )}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile, index) => (
          <SummaryTile key={tile.label} tile={tile} currency={currency} index={index} />
        ))}
      </div>
    </section>
  )
}
