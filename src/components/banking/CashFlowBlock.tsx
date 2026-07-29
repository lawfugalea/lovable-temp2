/**
 * Money in and money out over the period.
 *
 * Buckets are calendar-aligned, so every bar covers a comparable span and the
 * one on the right is not systematically short. Internal movement is available
 * but off by default: it is real, and it is not spending, so it should not be
 * the first thing the chart says.
 */
import { useState } from 'react'
import { Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  BarSeries,
  bucketByCalendar,
  bucketUnitFor,
  ChartFrame,
  ChartLegend,
  ChartReadout,
  colorForSeries,
} from '@/components/charts'
import { money } from '@/lib/finance/format'
import type { DailyFlow, InternalTransfersSummary } from '@/lib/finance/analytics-types'

export type CashFlowBlockProps = {
  daily: DailyFlow[]
  range: { from: string; to: string }
  periodDays: number
  currency: string
  internalTransfers: InternalTransfersSummary | null
}

export function CashFlowBlock({ daily, range, periodDays, currency, internalTransfers }: CashFlowBlockProps) {
  const [cursor, setCursor] = useState<number | null>(null)
  const [showInternal, setShowInternal] = useState(false)

  const buckets = bucketByCalendar(daily, day => day.date, bucketUnitFor(periodDays), range)
  const sum = (index: number, pick: (day: DailyFlow) => number) =>
    buckets[index]?.items.reduce((total, day) => total + pick(day), 0) ?? 0
  const income = buckets.map((_, index) => sum(index, day => day.incomeCents))
  const spending = buckets.map((_, index) => sum(index, day => day.spendingCents))
  const internal = buckets.map((_, index) => sum(index, day => day.internalCents))

  const series = [
    { key: 'income', label: 'Money in', color: colorForSeries('income'), values: income },
    { key: 'spending', label: 'Money out', color: colorForSeries('spending'), values: spending },
    ...(showInternal
      ? [{ key: 'internal', label: 'Moved between accounts', color: colorForSeries('internal'), values: internal }]
      : []),
  ]
  const maxValue = Math.max(1, ...series.flatMap(entry => entry.values))
  const active = cursor === null ? null : buckets[cursor]

  return (
    <Card className="hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="text-xl">Money in and out</CardTitle>
        <CardDescription>
          {buckets[0]?.unit === 'day' ? 'By day' : buckets[0]?.unit === 'week' ? 'By week' : 'By month'} over the last {periodDays} days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartFrame
          ariaLabel={`Money in and out over the last ${periodDays} days. ${money(spending.reduce((total, value) => total + value, 0), { currency })} out against ${money(income.reduce((total, value) => total + value, 0), { currency })} in.`}
          slotCount={buckets.length}
          maxValue={maxValue}
          cursor={cursor}
          onCursorChange={setCursor}
          slotLabel={index => buckets[index]?.label ?? ''}
          cursorSummary={index => {
            const bucket = buckets[index]
            if (!bucket) return ''
            return `${bucket.longLabel}${bucket.partial ? ' (part period)' : ''}: ${money(spending[index], { currency })} out, ${money(income[index], { currency })} in`
          }}
          emptyMessage="No booked transactions in this period yet."
          readout={active ? undefined : (
            <ChartReadout
              title={`Last ${periodDays} days`}
              rows={[
                { label: 'Money in', value: money(income.reduce((total, value) => total + value, 0), { currency }), color: colorForSeries('income') },
                { label: 'Money out', value: money(spending.reduce((total, value) => total + value, 0), { currency }), color: colorForSeries('spending') },
              ]}
              footnote={buckets.some(bucket => bucket.partial)
                ? 'Lighter bars cover part of a period, so they are not directly comparable.'
                : undefined}
            />
          )}
        >
          {context => (
            <BarSeries
              context={context}
              series={series}
              partial={buckets.map(bucket => bucket.partial)}
              titleFor={(slot, key) => {
                const bucket = buckets[slot]
                const value = series.find(entry => entry.key === key)?.values[slot] ?? 0
                return `${bucket?.longLabel ?? ''} — ${series.find(entry => entry.key === key)?.label}: ${money(value, { currency })}`
              }}
            />
          )}
        </ChartFrame>

        <ChartLegend
          items={[
            { key: 'income', label: 'Money in', color: colorForSeries('income') },
            { key: 'spending', label: 'Money out', color: colorForSeries('spending') },
            { key: 'internal', label: 'Moved between accounts', color: colorForSeries('internal'), hidden: !showInternal },
          ]}
          onToggle={key => { if (key === 'internal') setShowInternal(value => !value) }}
        />

        {internalTransfers?.note && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{internalTransfers.note}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
