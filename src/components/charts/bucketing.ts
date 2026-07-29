/**
 * Group daily rows into calendar-aligned buckets.
 *
 * The previous charts sliced the data into fixed-size chunks of
 * `ceil(length / 14)` days. That left a short remainder at the end, so a 365-day
 * view drew thirteen 27-day bars beside one 14-day bar and always appeared to
 * show spending falling off a cliff. Tooltips also labelled those multi-week
 * aggregates with a single date.
 *
 * Here the boundaries come from the calendar and the requested range, so buckets
 * are comparable by construction, empty periods appear as zero-height bars
 * instead of vanishing, and anything only partly inside the range says so.
 */
import { dateRange, monthLabel } from '../../lib/finance/format'

const DAY_MS = 24 * 60 * 60 * 1000

export type BucketUnit = 'day' | 'week' | 'month'

export type Bucket<T> = {
  key: string
  unit: BucketUnit
  /** Inclusive ISO dates. */
  from: string
  to: string
  label: string
  longLabel: string
  spanDays: number
  coveredDays: number
  /** The calendar period is not fully inside the requested range. */
  partial: boolean
  items: T[]
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** ISO weeks start on Monday. */
function startOfWeek(date: Date): Date {
  const day = date.getUTCDay()
  return addDays(date, -((day + 6) % 7))
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

/** Daily bars for a month, weekly up to four months, monthly beyond. */
export function bucketUnitFor(periodDays: number): BucketUnit {
  if (periodDays <= 31) return 'day'
  if (periodDays <= 120) return 'week'
  return 'month'
}

function boundariesFor(unit: BucketUnit, from: Date, to: Date): Array<{ start: Date; end: Date }> {
  const boundaries: Array<{ start: Date; end: Date }> = []
  if (unit === 'day') {
    for (let day = from; day <= to; day = addDays(day, 1)) boundaries.push({ start: day, end: day })
    return boundaries
  }
  if (unit === 'week') {
    for (let week = startOfWeek(from); week <= to; week = addDays(week, 7)) {
      boundaries.push({ start: week, end: addDays(week, 6) })
    }
    return boundaries
  }
  for (let month = startOfMonth(from); month <= to; month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))) {
    boundaries.push({ start: month, end: endOfMonth(month) })
  }
  return boundaries
}

export function bucketByCalendar<T>(
  rows: readonly T[],
  dateOf: (row: T) => string,
  unit: BucketUnit,
  range: { from: string; to: string },
): Array<Bucket<T>> {
  const from = parse(range.from)
  const to = parse(range.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return []

  const buckets = boundariesFor(unit, from, to).map(({ start, end }) => {
    // Clamp to the requested range, and remember that we had to.
    const visibleStart = start < from ? from : start
    const visibleEnd = end > to ? to : end
    const spanDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
    const coveredDays = Math.round((visibleEnd.getTime() - visibleStart.getTime()) / DAY_MS) + 1
    const label = unit === 'month' ? monthLabel(iso(start).slice(0, 7)) : dateRange(visibleStart, visibleEnd)
    return {
      key: iso(start),
      unit,
      from: iso(visibleStart),
      to: iso(visibleEnd),
      label,
      longLabel: unit === 'day'
        ? label
        : `${dateRange(visibleStart, visibleEnd)} · ${coveredDays} day${coveredDays === 1 ? '' : 's'}${coveredDays < spanDays ? ` of ${spanDays}` : ''}`,
      spanDays,
      coveredDays,
      partial: coveredDays < spanDays,
      items: [] as T[],
    }
  })

  const index = new Map(buckets.map(bucket => [bucket.key, bucket]))
  const keyFor = (date: Date) => iso(unit === 'day' ? date : unit === 'week' ? startOfWeek(date) : startOfMonth(date))
  for (const row of rows) {
    const date = parse(dateOf(row))
    if (Number.isNaN(date.getTime()) || date < from || date > to) continue
    index.get(keyFor(date))?.items.push(row)
  }
  return buckets
}
