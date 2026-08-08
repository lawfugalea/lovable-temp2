/**
 * Integer-cent arithmetic for every finance statistic.
 *
 * Amounts arrive as `Decimal(19,4)` from Postgres. The previous pipeline turned
 * them into floats and summed those, then rounded with a `Number.EPSILON` fudge
 * that cannot help: the epsilon is absorbed by the addition for any magnitude
 * above about 2. Truncating to 2dp at every aggregation level is also why
 * category shares never quite reconciled with the transaction list.
 *
 * So: convert once, at the Prisma boundary, and aggregate in integers. Cents fit
 * comfortably in a double — 2^53 cents is about €90 trillion.
 */

/** An integer number of minor currency units. */
export type Cents = number

const DECIMAL_PATTERN = /^([+-]?)(\d*)(?:\.(\d*))?$/

function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

/**
 * Parse a decimal amount into cents without ever going through a float.
 *
 * Rounds half away from zero at the third decimal, so `'1.005'` is 101 cents
 * where `Math.round(1.005 * 100)` gives 100. Throws on anything that is not a
 * finite decimal, because a malformed amount should be loud rather than quietly
 * become zero.
 */
export function toCents(value: string | number | { toString(): string }): Cents {
  const parsed = toCentsOrNull(value)
  if (parsed === null) throw new Error(`Not a decimal amount: ${String(value)}`)
  return parsed
}

/** As {@link toCents}, but returns null instead of throwing. */
export function toCentsOrNull(value: string | number | { toString(): string } | null | undefined): Cents | null {
  if (value === null || value === undefined) return null
  let text = typeof value === 'string' ? value.trim() : String(value).trim()
  if (!text) return null
  // Exponent notation only reaches us from a JS number; normalise it to plain
  // decimal digits so the string parser below stays the single code path.
  if (/e/i.test(text)) {
    const numeric = Number(text)
    if (!Number.isFinite(numeric)) return null
    text = numeric.toFixed(4)
  }
  const match = DECIMAL_PATTERN.exec(text)
  if (!match) return null
  const [, sign, whole, fraction = ''] = match
  if (!whole && !fraction) return null

  const units = whole ? Number(whole) : 0
  if (!Number.isSafeInteger(units)) return null
  const padded = `${fraction}000`.slice(0, 3)
  const cents = units * 100 + Number(padded.slice(0, 2)) + (Number(padded[2]) >= 5 ? 1 : 0)
  if (!Number.isSafeInteger(cents)) return null
  return sign === '-' ? -cents : cents
}

/** Cents back to a decimal number. Display and legacy adapters only. */
export function fromCents(cents: Cents): number {
  return cents / 100
}

/** Cents as a fixed 2dp string, e.g. `19115` becomes `"191.15"`. */
export function centsToFixed(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0
  for (const value of values) total += value
  return total
}

export function absCents(cents: Cents): Cents {
  return Math.abs(cents)
}

/**
 * `part` as a percentage of `total`, to one decimal place.
 *
 * Null when the total is zero — a share of nothing is undefined, and returning 0
 * would render as a real "0% of spending".
 */
export function percentOf(part: Cents, total: Cents): number | null {
  if (total === 0) return null
  return Math.round((part / total) * 1000) / 10
}

/** Integer mean, rounded half away from zero. Zero when there is nothing to average. */
export function meanCents(total: Cents, count: number): Cents {
  if (count <= 0) return 0
  return roundHalfAwayFromZero(total / count)
}

/**
 * Signed percentage change between two non-negative magnitudes, to one decimal.
 *
 * Null when the previous value is zero: "grew from nothing" has no percentage,
 * and the old code's `null` there conflated it with "no data". Callers comparing
 * a signed quantity (net position) must use an absolute delta instead — a
 * percentage change across zero carries no meaning.
 */
export function changePercent(current: Cents, previous: Cents): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}
