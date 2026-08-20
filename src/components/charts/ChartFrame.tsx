/**
 * The frame every chart draws inside: grid, axis, crosshair, and the whole
 * accessibility contract in one place.
 *
 * Charts here are readable without seeing them. The svg carries a label
 * containing real figures, arrow keys walk the buckets, and whatever the cursor
 * lands on is announced and also written out underneath as text — so the chart
 * is a summary of the readout rather than the only way to get the numbers.
 */
import { type ReactNode, useId, useRef, useState } from 'react'
import { bandScale, type BandScale, linearScale, niceTicks, PLOT, type Scale } from './chart-scales'
import { moneyCompact } from '../../lib/finance/format'

export type ChartContext = {
  x: BandScale
  y: Scale
  plot: { left: number; right: number; top: number; bottom: number; width: number; height: number }
  baselineY: number
  cursor: number | null
  /** SVG filter that makes a series look like it emits light. */
  glowFilter: string
}

export type ChartFrameProps = {
  /** A sentence with figures in it, not "bar chart". Read instead of the chart. */
  ariaLabel: string
  caption?: ReactNode
  slotCount: number
  maxValue: number
  minValue?: number
  height?: 'sm' | 'md' | 'lg'
  minWidthClass?: string
  gridLines?: number
  valueTickFormat?: (value: number) => string
  /** Label for a slot — a range like "7–13 Jul", never a single date for an aggregate. */
  slotLabel: (index: number) => string
  tickEvery?: number
  emptyMessage?: string
  cursor: number | null
  onCursorChange: (index: number | null) => void
  /** Announced and displayed for whichever slot the cursor is on. */
  cursorSummary?: (index: number) => string
  children: (context: ChartContext) => ReactNode
  readout?: ReactNode
}

const HEIGHTS = { sm: 'h-32', md: 'h-52', lg: 'h-64' } as const

export function ChartFrame({
  ariaLabel,
  caption,
  slotCount,
  maxValue,
  minValue = 0,
  height = 'md',
  minWidthClass = 'min-w-[620px]',
  gridLines = 3,
  valueTickFormat = moneyCompact,
  slotLabel,
  tickEvery,
  emptyMessage = 'Nothing to chart for this period yet.',
  cursor,
  onCursorChange,
  cursorSummary,
  children,
  readout,
}: ChartFrameProps) {
  const surface = useRef<SVGSVGElement>(null)
  const captionId = useId()
  const glowId = `chart-glow-${useId().replace(/:/g, '')}`
  const [focused, setFocused] = useState(false)

  const plot = {
    left: PLOT.padLeft,
    right: PLOT.width - PLOT.padRight,
    top: PLOT.padTop,
    bottom: PLOT.height - PLOT.padBottom,
    width: PLOT.width - PLOT.padLeft - PLOT.padRight,
    height: PLOT.height - PLOT.padTop - PLOT.padBottom,
  }

  const ticks = niceTicks(maxValue, minValue, gridLines)
  const domainMax = Math.max(maxValue, ticks[ticks.length - 1] ?? 0)
  const y = linearScale([minValue, domainMax], [plot.bottom, plot.top])
  const x = bandScale(slotCount, [plot.left, plot.right])
  const baselineY = y(Math.max(0, minValue))

  // Left to the React Compiler rather than a manual useCallback: `x` is rebuilt
  // each render, so a dependency array here only defeats the compiler.
  const moveCursor = (clientX: number) => {
    const bounds = surface.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || slotCount === 0) return
    const ratio = (clientX - bounds.left) / bounds.width
    onCursorChange(x.indexAt(ratio * PLOT.width))
  }

  // An empty chart is a sentence, not a labelled but empty image.
  if (slotCount === 0) {
    return (
      <figure className="space-y-3">
        <div className={`chart-panel flex ${HEIGHTS[height]} items-center justify-center rounded-xl border border-[hsl(var(--chart-panel-border))] bg-[hsl(var(--chart-panel-surface))] px-4 text-center text-sm text-[hsl(var(--chart-panel-ink))]`}>
          {emptyMessage}
        </div>
        {caption && <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>}
      </figure>
    )
  }

  const step = tickEvery ?? Math.max(1, Math.ceil(slotCount / 6))
  const activeSummary = cursor === null ? null : cursorSummary?.(cursor) ?? slotLabel(cursor)

  return (
    <figure className="space-y-3">
      <div className="chart-panel overflow-x-auto rounded-xl">
        <svg
          ref={surface}
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          preserveAspectRatio="none"
          className={`${HEIGHTS[height]} w-full ${minWidthClass} touch-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          role="img"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-describedby={caption ? captionId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onCursorChange(null) }}
          onMouseMove={event => moveCursor(event.clientX)}
          onMouseLeave={() => onCursorChange(null)}
          onTouchMove={event => moveCursor(event.touches[0].clientX)}
          onTouchEnd={() => onCursorChange(null)}
          onKeyDown={event => {
            const current = cursor ?? 0
            if (event.key === 'ArrowRight') onCursorChange(Math.min(slotCount - 1, current + 1))
            else if (event.key === 'ArrowLeft') onCursorChange(Math.max(0, current - 1))
            else if (event.key === 'Home') onCursorChange(0)
            else if (event.key === 'End') onCursorChange(slotCount - 1)
            else if (event.key === 'Escape') onCursorChange(null)
            else return
            event.preventDefault()
          }}
        >
          {/* The panel itself: a dark instrument face with a faint measurement
              grid, in both themes. */}
          <rect
            x={0}
            y={0}
            width={PLOT.width}
            height={PLOT.height}
            rx={14}
            fill="hsl(var(--chart-panel-surface))"
            stroke="hsl(var(--chart-panel-border))"
          />
          <g opacity={0.5}>
            {Array.from({ length: Math.ceil(PLOT.width / 36) }, (_, index) => (
              <line
                key={`v${index}`}
                x1={index * 36}
                x2={index * 36}
                y1={0}
                y2={PLOT.height}
                stroke="hsl(var(--chart-panel-grid) / 0.06)"
              />
            ))}
          </g>

          <defs>
            {/* The series is drawn twice: blurred underneath, sharp on top, so the
                colour bleeds into the surface the way an emissive display does.
                Purely visual — the figures live in the readout below. */}
            <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {ticks.map(tick => (
            <g key={tick}>
              <line
                x1={plot.left}
                x2={plot.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="hsl(var(--chart-panel-grid) / 0.14)"
                strokeDasharray="4 5"
              />
              <text
                x={plot.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                fill="hsl(var(--chart-panel-ink))"
                className="text-[11px] tabular-nums"
              >
                {valueTickFormat(tick)}
              </text>
            </g>
          ))}

          {minValue < 0 && (
            <line x1={plot.left} x2={plot.right} y1={y(0)} y2={y(0)} stroke="hsl(var(--chart-panel-grid) / 0.3)" strokeWidth={1.5} />
          )}

          {cursor !== null && (
            <g filter={`url(#${glowId})`}>
              <line
                x1={x.center(cursor)}
                x2={x.center(cursor)}
                y1={plot.top}
                y2={plot.bottom}
                stroke="hsl(var(--ring))"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.8}
              />
            </g>
          )}

          {children({ x, y, plot, baselineY, cursor, glowFilter: `url(#${glowId})` })}

          {Array.from({ length: slotCount }, (_, index) => index)
            .filter(index => index % step === 0 || index === slotCount - 1)
            .map(index => (
              <text
                key={index}
                x={x.center(index)}
                y={PLOT.height - 8}
                textAnchor="middle"
                fill="hsl(var(--chart-panel-ink))"
                className="text-[11px]"
              >
                {slotLabel(index)}
              </text>
            ))}
        </svg>
      </div>

      <p className="sr-only" aria-live="polite">{focused && activeSummary ? activeSummary : ''}</p>
      {activeSummary && (
        <p className="text-xs font-medium text-foreground tabular-nums">{activeSummary}</p>
      )}
      {caption && <figcaption id={captionId} className="text-xs text-muted-foreground">{caption}</figcaption>}
      {readout}
    </figure>
  )
}
