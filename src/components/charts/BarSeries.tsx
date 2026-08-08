/**
 * Grouped or stacked bars inside a {@link ChartFrame}.
 *
 * Partial buckets — a month still running, or a week clipped by the start of the
 * range — are drawn lighter with a dashed cap, because a half-elapsed period
 * standing at full opacity beside complete ones invites a comparison that is not
 * there.
 */
import type { ChartContext } from './ChartFrame'

export type BarSeriesDefinition = {
  key: string
  label: string
  color: string
  values: number[]
}

export type BarSeriesProps = {
  context: ChartContext
  series: BarSeriesDefinition[]
  mode?: 'grouped' | 'stacked'
  partial?: boolean[]
  maxBarWidth?: number
  radius?: number
  titleFor?: (slot: number, seriesKey: string) => string
  animate?: boolean
}

export function BarSeries({
  context,
  series,
  mode = 'grouped',
  partial = [],
  maxBarWidth = 18,
  radius = 4,
  titleFor,
  animate = true,
}: BarSeriesProps) {
  const { x, y, baselineY, glowFilter } = context
  const visible = series.filter(entry => entry.values.some(value => value !== 0))
  const lanes = mode === 'grouped' ? Math.max(1, visible.length) : 1
  const laneWidth = Math.min(maxBarWidth, x.bandWidth / lanes)
  const groupWidth = laneWidth * lanes

  return (
    <>
      {Array.from({ length: x.count }, (_, slot) => {
        const isPartial = partial[slot] ?? false
        let stackTop = baselineY
        return (
          <g
            key={slot}
            filter={glowFilter}
            opacity={isPartial ? 0.55 : 1}
            className={animate ? 'animate-grow-bar' : undefined}
            style={animate ? {
              transformBox: 'fill-box',
              transformOrigin: 'bottom',
              animationDelay: `${Math.min(slot * 18, 320)}ms`,
            } : undefined}
          >
            {visible.map((entry, lane) => {
              const value = entry.values[slot] ?? 0
              if (value === 0) return null
              const top = mode === 'stacked' ? stackTop - (baselineY - y(value)) : y(value)
              const height = Math.max(1, baselineY - y(value))
              if (mode === 'stacked') stackTop = top
              const left = mode === 'grouped'
                ? x.center(slot) - groupWidth / 2 + lane * laneWidth
                : x.center(slot) - laneWidth / 2
              return (
                <rect
                  key={entry.key}
                  x={left + (mode === 'grouped' ? 1 : 0)}
                  y={top}
                  width={Math.max(2, laneWidth - (mode === 'grouped' ? 2 : 0))}
                  height={height}
                  rx={radius}
                  fill={entry.color}
                  strokeDasharray={isPartial ? '3 2' : undefined}
                  stroke={isPartial ? entry.color : undefined}
                >
                  <title>{titleFor?.(slot, entry.key) ?? `${entry.label}: ${value}`}</title>
                </rect>
              )
            })}
          </g>
        )
      })}
    </>
  )
}
