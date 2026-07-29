/**
 * Month against month.
 *
 * The current month is still running and the earliest one usually starts partway
 * through, so both are drawn lighter and labelled — a month with nine days in it
 * standing at full height beside a complete one is the easiest way to read a
 * trend that is not there.
 */
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { BarSeries, ChartFrame, ChartLegend, ChartReadout, colorForSeries } from '@/components/charts'
import { money, monthLabel, signedMoney } from '@/lib/finance/format'
import type { CurrentMonthFlow, MonthlyFlow } from '@/lib/finance/analytics-types'

export type AnalyticsMonthlySectionProps = {
  monthly: MonthlyFlow[]
  currentMonth: CurrentMonthFlow
  currency: string
}

export function AnalyticsMonthlySection({ monthly, currentMonth, currency }: AnalyticsMonthlySectionProps) {
  const [cursor, setCursor] = useState<number | null>(null)
  const income = monthly.map(month => month.incomeCents)
  const spending = monthly.map(month => month.spendingCents)

  const pace = currentMonth.paceVsPreviousPercent
  const paceLabel = pace === null
    ? null
    : pace > 0
      ? `${Math.round(pace)}% ahead of where you were by this day last month`
      : pace < 0
        ? `${Math.abs(Math.round(pace))}% behind where you were by this day last month`
        : 'Exactly where you were by this day last month'

  return (
    <Card className="instrument-grid relative overflow-hidden transition-shadow hover:-translate-y-0 hover:shadow-glow-inset">
      <CardHeader className="relative">
        <CardTitle className="text-xl">Month by month</CardTitle>
        <CardDescription>
          {paceLabel ?? 'How each month compares once it is complete.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <ChartFrame
          ariaLabel={`Income and spending across ${monthly.length} months, most recently ${money(spending.at(-1) ?? 0, { currency })} out.`}
          slotCount={monthly.length}
          maxValue={Math.max(1, ...income, ...spending)}
          cursor={cursor}
          onCursorChange={setCursor}
          slotLabel={index => monthLabel(monthly[index]?.month ?? '')}
          cursorSummary={index => {
            const month = monthly[index]
            if (!month) return ''
            return `${monthLabel(month.month, true)}${month.partial ? ' (incomplete)' : ''}: ${money(month.spendingCents, { currency })} out, ${money(month.incomeCents, { currency })} in, net ${signedMoney(month.netCents, currency)}`
          }}
          emptyMessage="No months with data yet."
        >
          {context => (
            <BarSeries
              context={context}
              series={[
                { key: 'income', label: 'Money in', color: colorForSeries('income'), values: income },
                { key: 'spending', label: 'Money out', color: colorForSeries('spending'), values: spending },
              ]}
              partial={monthly.map(month => month.partial)}
              titleFor={(slot, key) => {
                const month = monthly[slot]
                const value = key === 'income' ? income[slot] : spending[slot]
                return `${monthLabel(month?.month ?? '', true)}: ${money(value, { currency })} ${key === 'income' ? 'in' : 'out'}`
              }}
            />
          )}
        </ChartFrame>

        <ChartLegend
          items={[
            { key: 'income', label: 'Money in', color: colorForSeries('income') },
            { key: 'spending', label: 'Money out', color: colorForSeries('spending') },
          ]}
        />

        <ChartReadout
          title={`${monthLabel(currentMonth.month, true)} so far`}
          rows={[
            { label: 'Out this month', value: money(currentMonth.spendingCents, { currency }) },
            { label: 'By this day last month', value: money(currentMonth.previousMonthSameDayCents, { currency }) },
            { label: 'Last month in full', value: money(currentMonth.previousMonthSpendingCents, { currency }) },
            { label: 'Day', value: `${currentMonth.daysElapsed} of ${currentMonth.daysInMonth}` },
          ]}
          footnote={monthly.some(month => month.partial)
            ? 'Lighter bars are months that are not complete, so they sit below a full month for that reason alone.'
            : undefined}
        />
      </CardContent>
    </Card>
  )
}
