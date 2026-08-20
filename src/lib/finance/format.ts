/**
 * One place that turns finance values into text.
 *
 * Six near-identical formatters had grown across the banking pages, each with
 * slightly different rules about decimals and signs, which is part of why the
 * same figure could read differently in two places. Everything here is
 * cents-first, because that is how the analytics payload arrives.
 */
import { APP_LOCALE } from '../utils'

const DAY_MS = 24 * 60 * 60 * 1000

export type MoneyOptions = {
  currency?: string
  /** `always` prefixes a + on positives. */
  sign?: 'auto' | 'always'
  /** `auto` drops ".00" on whole amounts, matching the planner's long-standing look. */
  decimals?: 'auto' | 'always'
  /** €1.2k. Axis labels and dense tiles only. */
  compact?: boolean
}

export function money(cents: number, options: MoneyOptions = {}): string {
  const { currency = 'EUR', sign = 'auto', decimals = 'auto', compact = false } = options
  const value = cents / 100
  const formatted = new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency,
    ...(compact
      ? { notation: 'compact', maximumFractionDigits: Math.abs(cents) >= 100_000 ? 1 : 0 }
      : {
        minimumFractionDigits: decimals === 'always' || cents % 100 !== 0 ? 2 : 0,
        maximumFractionDigits: decimals === 'always' || cents % 100 !== 0 ? 2 : 0,
      }),
  }).format(value)
  return sign === 'always' && cents > 0 ? `+${formatted}` : formatted
}

/** Compact form for axis ticks, where space is the constraint. */
export function moneyCompact(cents: number, currency = 'EUR'): string {
  return money(cents, { currency, compact: true })
}

/** Always shows the direction, for deltas and transaction rows. */
export function signedMoney(cents: number, currency = 'EUR'): string {
  return money(cents, { currency, sign: 'always' })
}

/**
 * Percentages render as an em dash when undefined, never as 0%: "no prior data"
 * and "no change" are different statements.
 */
export function percent(value: number | null, options: { decimals?: number; sign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const { decimals = 0, sign = false } = options
  const formatted = value.toFixed(decimals)
  return `${sign && value > 0 ? '+' : ''}${formatted}%`
}

/**
 * Net position is described with a signed amount and a direction, because a
 * percentage change of a quantity that crosses zero is meaningless.
 */
export function netChangeLabel(cents: number, direction: 'UP' | 'DOWN' | 'FLAT', currency = 'EUR'): string {
  if (direction === 'FLAT' || cents === 0) return 'Level with the period before'
  return `${money(Math.abs(cents), { currency })} ${direction === 'UP' ? 'better' : 'worse'} than the period before`
}

export function comparisonLabel(changePercent: number | null, periodDays: number): string {
  const window = periodDays === 30 ? '30 days' : periodDays === 365 ? 'year' : `${periodDays} days`
  if (changePercent === null) return `No comparable ${window} before this`
  if (changePercent === 0) return `Level with the ${window} before`
  return `${percent(Math.abs(changePercent), { decimals: Math.abs(changePercent) < 10 ? 1 : 0 })} ${changePercent > 0 ? 'more' : 'less'} than the ${window} before`
}

function asDate(value: string | Date): Date {
  return typeof value === 'string'
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)
    : value
}

export function shortDate(value: string | Date): string {
  const date = asDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
}

export function longDate(value: string | Date): string {
  const date = asDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/**
 * A range, so a chart bucket can never be labelled with a single date. Reporting
 * a 27-day aggregate as "8 Jul" was one of the ways the old charts misled.
 */
export function dateRange(from: string | Date, to: string | Date): string {
  const start = asDate(from)
  const end = asDate(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—'
  if (start.getTime() === end.getTime()) return shortDate(start)
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
  const startLabel = sameMonth
    ? new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', timeZone: 'UTC' }).format(start)
    : shortDate(start)
  return `${startLabel}–${shortDate(end)}`
}

/** `2026-07` becomes `Jul` or `July 2026`. */
export function monthLabel(month: string, long = false): string {
  const date = new Date(`${month}-01T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return month
  return new Intl.DateTimeFormat(APP_LOCALE, {
    month: long ? 'long' : 'short',
    ...(long ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date)
}

export function relativeDay(value: string | Date, now = new Date()): string {
  const date = asDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  const days = Math.round(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / DAY_MS,
  )
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return days <= 14 ? `In ${days} days` : shortDate(date)
  return days >= -14 ? `${Math.abs(days)} days ago` : shortDate(date)
}

export function relativeSync(value: string | null, now: number): string {
  if (!value) return 'Not synced yet'
  const elapsed = now - new Date(value).getTime()
  if (elapsed < 60_000) return 'Synced just now'
  if (elapsed < 60 * 60_000) return `Synced ${Math.floor(elapsed / 60_000)} min ago`
  if (elapsed < 24 * 60 * 60_000) return `Synced ${Math.floor(elapsed / 3_600_000)} hr ago`
  return `Synced ${longDate(value)}`
}

export function coverageLabel(coverage: {
  periodDays: number
  coveredDays: number
  complete: boolean
  dataStartDate: string | null
}): string {
  if (coverage.complete) return `Covers all ${coverage.periodDays} days`
  const from = coverage.dataStartDate ? ` Your bank's history starts on ${longDate(coverage.dataStartDate)}.` : ''
  return `Based on ${coverage.coveredDays} of the ${coverage.periodDays} days requested.${from}`
}

/**
 * Decimal to cents, for the endpoints that still speak decimals. Never format a
 * decimal directly — route it through here so rounding stays in one place.
 */
export function toCents(amount: string | number): number {
  const value = Number(amount)
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}
