/**
 * A line, optionally filled, that draws itself in on mount.
 *
 * `drawKey` re-keys the paths so the animation replays when the filters change —
 * without it the line silently swaps to new data and the change is easy to miss.
 * A single data point renders as a dot rather than a zero-length path.
 */
import { areaPath, linePath, type Point } from './chart-scales'
import type { ChartContext } from './ChartFrame'

export type LineSeriesProps = {
  context: ChartContext
  /** Null leaves a gap rather than drawing through missing data. */
  points: Array<number | null>
  color: string
  label: string
  width?: number
  area?: boolean
  dashed?: boolean
  drawKey?: string | number
  showDots?: 'never' | 'single' | 'always'
  titleFor?: (slot: number) => string
}

export function LineSeries({
  context,
  points,
  color,
  label,
  width = 2,
  area = false,
  dashed = false,
  drawKey = 'static',
  showDots = 'single',
  titleFor,
}: LineSeriesProps) {
  const { x, y, baselineY, glowFilter } = context
  const resolved: Array<Point & { slot: number }> = points
    .map((value, slot) => (value === null ? null : { x: x.center(slot), y: y(value), slot }))
    .filter((point): point is Point & { slot: number } => point !== null)

  if (!resolved.length) return null

  const dots = showDots === 'always' || (showDots === 'single' && resolved.length === 1)

  return (
    <g filter={glowFilter}>
      {area && resolved.length > 1 && (
        <path
          key={`area-${drawKey}`}
          d={areaPath(resolved, baselineY)}
          fill={color}
          opacity={0.12}
          className="animate-fade-in animation-delay-300"
        />
      )}
      {resolved.length > 1 && (
        <path
          key={`line-${drawKey}`}
          d={linePath(resolved)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? '5 4' : undefined}
          pathLength={dashed ? undefined : 1}
          className={dashed ? undefined : 'animate-draw-line [stroke-dasharray:1]'}
        >
          <title>{label}</title>
        </path>
      )}
      {(dots || resolved.length === 1) && resolved.map(point => (
        <circle key={point.slot} cx={point.x} cy={point.y} r={3.5} fill={color}>
          <title>{titleFor?.(point.slot) ?? label}</title>
        </circle>
      ))}
    </g>
  )
}
