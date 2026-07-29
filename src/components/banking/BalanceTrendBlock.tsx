/**
 * How the total balance has moved.
 *
 * The bank reports today's balance and keeps no history, so this is worked
 * backwards from today less everything booked since. That is an identity rather
 * than an estimate, but only as far back as the transactions reach — where it
 * cannot stand behind a point it draws nothing and says why, rather than
 * extending a comfortable-looking line into territory it knows nothing about.
 */
import { useState } from 'react'
import { Info, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  BarSeries,
  ChartFrame,
  ChartReadout,
  colorForSeries,
  LineSeries,
} from '@/components/charts'
import { longDate, money, monthLabel, signedMoney } from '@/lib/finance/format'
import type { BalanceTrend, MonthlyFlow } from '@/lib/finance/analytics-types'

export type BalanceTrendBlockProps = {
  trend: BalanceTrend | null
  monthly: MonthlyFlow[]
  currency: string
  drawKey: string
}

export function BalanceTrendBlock({ trend, monthly, currency, drawKey }: BalanceTrendBlockProps) {
  const [cursor, setCursor] = useState<number | null>(null)
  const points = trend?.points ?? []
  const usable = points.length >= 2

  // Without enough history for a line, monthly net is the honest alternative —
  // it answers "are we ahead or behind" without pretending to know past balances.
  const fallback = monthly.slice(-6)
  const netValues = fallback.map(month => month.netCents)

  const balances = points.map(point => point.balanceCents)
  const minBalance = Math.min(0, ...balances)
  const maxBalance = Math.max(1, ...balances)

  return (
    <Card className="hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-5 w-5 text-module-finances" aria-hidden="true" />
          {usable ? 'Balance over time' : 'Month by month'}
        </CardTitle>
        <CardDescription>
          {usable
            ? 'Worked backwards from today’s balance and everything booked since.'
            : 'What went in against what went out, by month.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {usable ? (
          <ChartFrame
            ariaLabel={`Total balance over ${points.length} points, ending at ${money(balances[balances.length - 1], { currency })}.`}
            slotCount={points.length}
            maxValue={maxBalance}
            minValue={minBalance}
            cursor={cursor}
            onCursorChange={setCursor}
            slotLabel={index => monthLabel(points[index].date.slice(0, 7))}
            cursorSummary={index => `${longDate(points[index].date)}: ${money(points[index].balanceCents, { currency })}${points[index].derived ? ' (worked backwards)' : ''}`}
          >
            {context => (
              <LineSeries
                context={context}
                points={balances}
                color={colorForSeries('total')}
                label="Total balance"
                area
                drawKey={drawKey}
                titleFor={index => `${longDate(points[index].date)}: ${money(points[index].balanceCents, { currency })}`}
              />
            )}
          </ChartFrame>
        ) : (
          <ChartFrame
            ariaLabel={`Net position by month over ${fallback.length} months.`}
            slotCount={fallback.length}
            maxValue={Math.max(1, ...netValues)}
            minValue={Math.min(0, ...netValues)}
            cursor={cursor}
            onCursorChange={setCursor}
            slotLabel={index => monthLabel(fallback[index].month)}
            cursorSummary={index => `${monthLabel(fallback[index].month, true)}: ${signedMoney(fallback[index].netCents, currency)}${fallback[index].partial ? ' (month still running)' : ''}`}
            emptyMessage="Not enough history yet to show a trend."
          >
            {context => (
              <BarSeries
                context={context}
                series={[{ key: 'net', label: 'Net', color: colorForSeries('total'), values: netValues }]}
                partial={fallback.map(month => month.partial)}
                titleFor={index => `${monthLabel(fallback[index].month, true)}: ${signedMoney(fallback[index].netCents, currency)}`}
              />
            )}
          </ChartFrame>
        )}

        {usable && (
          <ChartReadout
            title="Balance"
            rows={[
              { label: 'Now', value: money(balances[balances.length - 1], { currency }) },
              {
                label: `Since ${monthLabel(points[0].date.slice(0, 7), true)}`,
                value: signedMoney(balances[balances.length - 1] - balances[0], currency),
              },
            ]}
          />
        )}

        {trend?.caveat && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{trend.caveat}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
