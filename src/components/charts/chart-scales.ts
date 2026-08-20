/**
 * Scales and path builders shared by every chart.
 *
 * Each chart used to carry its own copy of this arithmetic, which is how two
 * charts of the same data ended up with different bucket widths and different
 * ideas about what an empty series looks like. Degenerate data is handled here,
 * once: a zero-span domain, an all-zero series and a single data point all have
 * defined answers rather than producing NaN geometry.
 */

/** The fixed drawing surface. Charts scale by viewBox, not by pixel width. */
export const PLOT = {
  width: 720,
  height: 220,
  padTop: 14,
  padRight: 8,
  padBottom: 26,
  padLeft: 48,
} as const

export type Scale = {
  (value: number): number
  invert(pixel: number): number
  domain: readonly [number, number]
}

export function linearScale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  // A flat series still needs somewhere to draw: put it in the middle rather
  // than dividing by zero.
  const scale = ((value: number) => (span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0))) as Scale
  scale.invert = (pixel: number) => (span === 0 ? d0 : d0 + ((pixel - r0) / (r1 - r0)) * span)
  scale.domain = [d0, d1]
  return scale
}

export type BandScale = {
  count: number
  step: number
  bandWidth: number
  center(index: number): number
  start(index: number): number
  indexAt(pixel: number): number
}

export function bandScale(count: number, range: readonly [number, number], innerPad = 0.25): BandScale {
  const [r0, r1] = range
  const width = r1 - r0
  if (count <= 0) {
    return { count: 0, step: 0, bandWidth: 0, center: () => r0, start: () => r0, indexAt: () => -1 }
  }
  // A single point centred at 60% width reads as a data point; full-bleed reads
  // as a background slab.
  if (count === 1) {
    const bandWidth = width * 0.6
    return {
      count: 1,
      step: width,
      bandWidth,
      center: () => r0 + width / 2,
      start: () => r0 + (width - bandWidth) / 2,
      indexAt: () => 0,
    }
  }
  const step = width / count
  const bandWidth = step * (1 - innerPad)
  return {
    count,
    step,
    bandWidth,
    center: (index: number) => r0 + step * index + step / 2,
    start: (index: number) => r0 + step * index + (step - bandWidth) / 2,
    indexAt: (pixel: number) => Math.max(0, Math.min(count - 1, Math.floor((pixel - r0) / step))),
  }
}

/**
 * Axis ticks on round numbers. An all-zero series returns [0, 1] so the chart
 * draws a baseline with a 0 tick instead of an empty frame.
 */
export function niceTicks(max: number, min = 0, count = 3): number[] {
  if (!Number.isFinite(max) || max <= min) return [min, min === 0 ? 1 : min * 2]
  const span = max - min
  const rawStep = span / Math.max(1, count)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map(multiple => multiple * magnitude).find(candidate => candidate >= rawStep)
    ?? magnitude * 10
  const ticks: number[] = []
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 0.001; tick += step) {
    ticks.push(Math.round(tick * 1e6) / 1e6)
  }
  return ticks.length ? ticks : [min, max]
}

export type Point = { x: number; y: number }

export function linePath(points: readonly Point[]): string {
  if (!points.length) return ''
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
}

export function areaPath(points: readonly Point[], baselineY: number): string {
  if (!points.length) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${linePath(points)} L${last.x.toFixed(2)} ${baselineY.toFixed(2)} L${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`
}
