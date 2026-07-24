import React, { useMemo, useRef, useState } from 'react'
import { LineChart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import {
  HORIZONS,
  MAX_HORIZON_MONTHS,
  monthsUntilGoal,
  periodLabel,
  projectAccount,
  projectTotal,
  shiftPeriod,
  type SavingsAccount,
  type SavingsGoalMarker,
} from '@/lib/finance/savings'
import { euros } from './planner-types'

interface SavingsForecastChartProps {
  accounts: SavingsAccount[]
  goalMarkers: SavingsGoalMarker[]
  fromPeriod: string
  months: number
  onMonthsChange: (months: number) => void
}

/** Account lines. The total keeps --module-finances to itself so it always reads as the total. */
const LINE_COLORS = [
  'hsl(var(--brand-purple))',
  'hsl(var(--brand-teal))',
  'hsl(var(--brand-amber))',
  'hsl(var(--brand-green))',
  'hsl(var(--brand-coral))',
]
const TOTAL_COLOR = 'hsl(var(--module-finances))'

const WIDTH = 720
const HEIGHT = 220
const PAD_X = 6
const PAD_Y = 14

export default function SavingsForecastChart({
  accounts,
  goalMarkers,
  fromPeriod,
  months,
  onMonthsChange,
}: SavingsForecastChartProps) {
  const [custom, setCustom] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState<number | null>(null)
  const plot = useRef<SVGSVGElement | null>(null)

  const visible = accounts.filter(account => !hidden.has(account.id))

  const series = useMemo(() => visible.map((account, index) => ({
    account,
    color: LINE_COLORS[index % LINE_COLORS.length],
    points: projectAccount(account, months, fromPeriod),
  })), [visible, months, fromPeriod])

  const total = useMemo(() => projectTotal(visible, months, fromPeriod), [visible, months, fromPeriod])
  const last = total[total.length - 1]
  const peak = Math.max(last?.cents ?? 0, 1)
  const showTotal = visible.length > 1

  const x = (index: number) => PAD_X + (index / Math.max(1, months)) * (WIDTH - PAD_X * 2)
  const y = (cents: number) => HEIGHT - PAD_Y - (cents / peak) * (HEIGHT - PAD_Y * 2)
  const line = (points: Array<{ cents: number }>) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point.cents).toFixed(2)}`).join(' ')

  const toggleAccount = (id: string) => {
    setHidden(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      // Hiding the last visible line would leave an empty chart; keep at least one.
      else if (accounts.length - next.size > 1) next.add(id)
      return next
    })
  }

  const moveCursor = (clientX: number) => {
    const bounds = plot.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0) return
    const ratio = (clientX - bounds.left) / bounds.width
    setCursor(Math.min(months, Math.max(0, Math.round(ratio * months))))
  }

  const readoutIndex = cursor ?? months
  const readoutPeriod = shiftPeriod(fromPeriod, readoutIndex)

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="h-5 w-5 text-module-finances" /> Where you&rsquo;ll be
          </CardTitle>
          <CardDescription>
            {last && last.cents > 0 ? (
              <>Keep this up and you&rsquo;ll have <strong>{euros(last.cents)}</strong> by {periodLabel(last.period)}.</>
            ) : (
              <>Say what goes in each month and the forecast fills in.</>
            )}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={custom ? 'custom' : String(months)}
            onValueChange={value => {
              if (!value) return
              if (value === 'custom') setCustom(true)
              else {
                setCustom(false)
                onMonthsChange(Number(value))
              }
            }}
            aria-label="How far ahead to look"
          >
            {HORIZONS.map(horizon => (
              <ToggleGroupItem key={horizon} value={String(horizon)} aria-label={`${horizon} months`}>
                {horizon} mo
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value="custom" aria-label="A number of months you choose">Custom</ToggleGroupItem>
          </ToggleGroup>
          {custom && (
            <Input
              className="w-24"
              type="number"
              min={1}
              max={MAX_HORIZON_MONTHS}
              inputMode="numeric"
              aria-label={`Months ahead, 1 to ${MAX_HORIZON_MONTHS}`}
              value={months}
              onChange={event => {
                const next = Number(event.target.value)
                if (Number.isFinite(next) && next >= 1 && next <= MAX_HORIZON_MONTHS) onMonthsChange(Math.round(next))
              }}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <svg
          ref={plot}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-52 w-full touch-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          role="img"
          tabIndex={0}
          aria-label={
            last
              ? `Savings forecast over ${months} months, ending at ${euros(last.cents)} in ${periodLabel(last.period)}`
              : 'Savings forecast'
          }
          onMouseMove={event => moveCursor(event.clientX)}
          onMouseLeave={() => setCursor(null)}
          onTouchMove={event => moveCursor(event.touches[0].clientX)}
          onTouchEnd={() => setCursor(null)}
          onKeyDown={event => {
            if (event.key === 'ArrowRight') setCursor(Math.min(months, readoutIndex + 1))
            else if (event.key === 'ArrowLeft') setCursor(Math.max(0, readoutIndex - 1))
            else return
            event.preventDefault()
          }}
        >
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={HEIGHT - PAD_Y}
            y2={HEIGHT - PAD_Y}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />

          {/* Goal targets sit under the lines so they read as background rules. */}
          {goalMarkers.map(goal => {
            const owner = series.find(item => item.account.id === goal.accountId)
            if (!owner || monthsUntilGoal(owner.account, goal, months) === null) return null
            return (
              <line
                key={goal.id}
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={y(goal.targetCents)}
                y2={y(goal.targetCents)}
                stroke={owner.color}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.55}
              />
            )
          })}

          {series.map(item => (
            <path
              // Re-keying on the horizon restarts the draw-in when the view changes.
              key={`${item.account.id}-${months}`}
              d={line(item.points)}
              pathLength={1}
              fill="none"
              stroke={item.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-line [stroke-dasharray:1]"
            />
          ))}

          {showTotal && (
            <path
              key={`total-${months}`}
              d={line(total)}
              pathLength={1}
              fill="none"
              stroke={TOTAL_COLOR}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-line [stroke-dasharray:1]"
            />
          )}

          {cursor !== null && (
            <g>
              <line
                x1={x(cursor)}
                x2={x(cursor)}
                y1={PAD_Y}
                y2={HEIGHT - PAD_Y}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {series.map(item => (
                <circle
                  key={item.account.id}
                  cx={x(cursor)}
                  cy={y(item.points[cursor].cents)}
                  r={3.5}
                  fill={item.color}
                />
              ))}
              {showTotal && <circle cx={x(cursor)} cy={y(total[cursor].cents)} r={4.5} fill={TOTAL_COLOR} />}
            </g>
          )}
        </svg>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{periodLabel(fromPeriod)}</span>
          <span>{last ? periodLabel(last.period) : ''}</span>
        </div>

        {accounts.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {accounts.map((account, index) => {
              const off = hidden.has(account.id)
              return (
                <button
                  key={account.id}
                  type="button"
                  aria-pressed={!off}
                  onClick={() => toggleAccount(account.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    off ? 'text-muted-foreground opacity-60' : 'bg-muted/60',
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                  />
                  {account.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Doubles as the non-visual equivalent of the chart. */}
        <div className="rounded-xl border">
          <p className="border-b px-3.5 py-2 text-sm font-semibold">{periodLabel(readoutPeriod)}</p>
          <ul className="divide-y">
            {series.map(item => {
              const goals = goalMarkers.filter(goal => goal.accountId === item.account.id)
              return (
                <li key={item.account.id} className="px-3.5 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-sm">{item.account.name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {euros(item.points[readoutIndex].cents)}
                    </span>
                  </div>
                  {goals.map(goal => {
                    const reached = monthsUntilGoal(item.account, goal, months)
                    return (
                      <p key={goal.id} className="mt-0.5 text-xs text-muted-foreground">
                        {goal.name} · {euros(goal.targetCents)} ·{' '}
                        {reached === null
                          ? 'not within this view'
                          : reached === 0
                            ? 'already there'
                            : `around ${periodLabel(shiftPeriod(fromPeriod, reached))}`}
                      </p>
                    )
                  })}
                </li>
              )
            })}
            {showTotal && (
              <li className="flex items-center justify-between gap-3 px-3.5 py-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TOTAL_COLOR }} />
                  Everything together
                </span>
                <span className="text-sm font-bold tabular-nums">{euros(total[readoutIndex].cents)}</span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
