/**
 * A tiny trend line for tiles and headers. No axes, no cursor — if a reader
 * needs the figures, they belong in the tile's text, not in a 28px graphic.
 */
import { linePath } from './chart-scales'
import { colorForSeries } from './chart-palette'

/**
 * The viewBox is chosen to match the rendered aspect ratio. The line is drawn
 * with a normalised dash pattern, and stretching a 120×28 box across a full-width
 * card distorted that pattern enough to break the line into visible segments.
 */
const SIZES = {
  sm: { width: 120, height: 28, strokeWidth: 1.75, dot: 2.25 },
  lg: { width: 360, height: 72, strokeWidth: 2, dot: 3 },
} as const

export type SparklineProps = {
  values: number[]
  color?: string
  /** Required: the line means nothing without it to a screen reader. */
  ariaLabel: string
  className?: string
  showLastDot?: boolean
  size?: keyof typeof SIZES
}

export function Sparkline({
  values,
  color = colorForSeries('spending'),
  ariaLabel,
  className,
  showLastDot = true,
  size = 'sm',
}: SparklineProps) {
  const { width: WIDTH, height: HEIGHT, strokeWidth, dot } = SIZES[size]
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const inset = strokeWidth * 2
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * (WIDTH - inset * 2) + inset,
    y: HEIGHT - inset - ((value - min) / span) * (HEIGHT - inset * 2),
  }))
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className ?? 'h-7 w-[120px]'}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <path
        d={linePath(points)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="animate-draw-line [stroke-dasharray:1]"
        vectorEffect="non-scaling-stroke"
      />
      {showLastDot && <circle cx={last.x} cy={last.y} r={dot} fill={color} />}
    </svg>
  )
}
