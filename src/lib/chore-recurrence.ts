/**
 * Pure recurrence logic for household chores.
 *
 * All public functions speak date-only `YYYY-MM-DD` strings and work on UTC
 * noon internally, so DST transitions and server timezones can never shift an
 * occurrence to a neighbouring day.
 */

export type ChoreRecurrence =
  /** Weekday numbers use ISO numbering: 1 = Monday … 7 = Sunday. */
  | { type: 'WEEKLY'; daysOfWeek: number[] }
  | { type: 'EVERY_N_DAYS'; intervalDays: number; anchorDate: string }
  | { type: 'MONTHLY'; dayOfMonth: number }

export interface ChoreRecurrenceRow {
  recurrenceType: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'
  daysOfWeek: number[]
  intervalDays: number | null
  anchorDate: Date | null
  dayOfMonth: number | null
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_OCCURRENCES = 100

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false
  const parsed = toUtcNoon(value)
  return fromUtcNoon(parsed) === value
}

function toUtcNoon(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function fromUtcNoon(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: string, days: number): string {
  return fromUtcNoon(new Date(toUtcNoon(date).getTime() + days * DAY_MS))
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
function isoWeekday(date: string): number {
  const day = toUtcNoon(date).getUTCDay()
  return day === 0 ? 7 : day
}

function daysBetween(from: string, to: string): number {
  return Math.round((toUtcNoon(to).getTime() - toUtcNoon(from).getTime()) / DAY_MS)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
}

/** The day this MONTHLY chore falls due in a given month, clamped to month length. */
function monthlyDueDay(year: number, month: number, dayOfMonth: number): number {
  return Math.min(dayOfMonth, daysInMonth(year, month))
}

export function isDueOn(recurrence: ChoreRecurrence, date: string): boolean {
  switch (recurrence.type) {
    case 'WEEKLY':
      return recurrence.daysOfWeek.includes(isoWeekday(date))
    case 'EVERY_N_DAYS': {
      const offset = daysBetween(recurrence.anchorDate, date)
      return offset >= 0 && offset % recurrence.intervalDays === 0
    }
    case 'MONTHLY': {
      const [year, month, day] = date.split('-').map(Number)
      return day === monthlyDueDay(year, month, recurrence.dayOfMonth)
    }
  }
}

/** First due date on or after `from`. Returns null only for empty WEEKLY sets. */
export function nextOccurrence(recurrence: ChoreRecurrence, from: string): string | null {
  switch (recurrence.type) {
    case 'WEEKLY': {
      if (!recurrence.daysOfWeek.length) return null
      for (let offset = 0; offset < 7; offset++) {
        const candidate = addDays(from, offset)
        if (recurrence.daysOfWeek.includes(isoWeekday(candidate))) return candidate
      }
      return null
    }
    case 'EVERY_N_DAYS': {
      const offset = daysBetween(recurrence.anchorDate, from)
      if (offset <= 0) return recurrence.anchorDate
      const remainder = offset % recurrence.intervalDays
      return remainder === 0 ? from : addDays(from, recurrence.intervalDays - remainder)
    }
    case 'MONTHLY': {
      const [year, month, day] = from.split('-').map(Number)
      const dueThisMonth = monthlyDueDay(year, month, recurrence.dayOfMonth)
      if (day <= dueThisMonth) {
        return `${year}-${String(month).padStart(2, '0')}-${String(dueThisMonth).padStart(2, '0')}`
      }
      const nextYear = month === 12 ? year + 1 : year
      const nextMonth = month === 12 ? 1 : month + 1
      const dueNext = monthlyDueDay(nextYear, nextMonth, recurrence.dayOfMonth)
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dueNext).padStart(2, '0')}`
    }
  }
}

/** All due dates in [from, to], capped to protect against runaway ranges. */
export function occurrencesInRange(recurrence: ChoreRecurrence, from: string, to: string): string[] {
  const results: string[] = []
  let cursor = from
  while (results.length < MAX_OCCURRENCES) {
    const next = nextOccurrence(recurrence, cursor)
    if (!next || next > to) break
    results.push(next)
    cursor = addDays(next, 1)
  }
  return results
}

/** Most recent due date on or before `date`, looking back at most `lookbackDays`. */
export function lastScheduledOnOrBefore(
  recurrence: ChoreRecurrence,
  date: string,
  lookbackDays = 7,
): string | null {
  for (let offset = 0; offset <= lookbackDays; offset++) {
    const candidate = addDays(date, -offset)
    if (isDueOn(recurrence, candidate)) return candidate
  }
  return null
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function ordinal(day: number): string {
  const rem10 = day % 10
  const rem100 = day % 100
  if (rem10 === 1 && rem100 !== 11) return `${day}st`
  if (rem10 === 2 && rem100 !== 12) return `${day}nd`
  if (rem10 === 3 && rem100 !== 13) return `${day}rd`
  return `${day}th`
}

export function describeRecurrence(recurrence: ChoreRecurrence): string {
  switch (recurrence.type) {
    case 'WEEKLY': {
      const days = [...recurrence.daysOfWeek].sort((a, b) => a - b)
      if (days.length === 7) return 'Every day'
      if (days.length === 0) return 'No days selected'
      const names = days.map(day => WEEKDAY_NAMES[day - 1])
      if (names.length === 1) return `Every ${names[0]}`
      return `Every ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    }
    case 'EVERY_N_DAYS':
      return recurrence.intervalDays === 1 ? 'Every day' : `Every ${recurrence.intervalDays} days`
    case 'MONTHLY':
      return `Monthly on the ${ordinal(recurrence.dayOfMonth)}`
  }
}

/** Build the typed recurrence from a Chore database row. Throws on corrupt rows. */
export function choreRecurrenceFromRow(row: ChoreRecurrenceRow): ChoreRecurrence {
  switch (row.recurrenceType) {
    case 'WEEKLY':
      return { type: 'WEEKLY', daysOfWeek: row.daysOfWeek }
    case 'EVERY_N_DAYS':
      if (!row.intervalDays || !row.anchorDate) throw new Error('EVERY_N_DAYS chore is missing interval or anchor')
      return { type: 'EVERY_N_DAYS', intervalDays: row.intervalDays, anchorDate: fromUtcNoon(new Date(row.anchorDate.getTime() + 12 * 3600 * 1000)) }
    case 'MONTHLY':
      if (!row.dayOfMonth) throw new Error('MONTHLY chore is missing dayOfMonth')
      return { type: 'MONTHLY', dayOfMonth: row.dayOfMonth }
  }
}

export interface RecurrenceInput {
  recurrenceType?: unknown
  daysOfWeek?: unknown
  intervalDays?: unknown
  anchorDate?: unknown
  dayOfMonth?: unknown
}

export type ValidatedRecurrence =
  | { ok: true; recurrence: ChoreRecurrence }
  | { ok: false; error: string }

export function validateRecurrenceInput(input: RecurrenceInput): ValidatedRecurrence {
  switch (input.recurrenceType) {
    case 'WEEKLY': {
      const days = Array.isArray(input.daysOfWeek) ? input.daysOfWeek : null
      if (!days || days.length === 0) return { ok: false, error: 'Pick at least one weekday' }
      if (days.length > 7 || !days.every(day => Number.isInteger(day) && day >= 1 && day <= 7)) {
        return { ok: false, error: 'Weekdays must be numbers from 1 (Monday) to 7 (Sunday)' }
      }
      return { ok: true, recurrence: { type: 'WEEKLY', daysOfWeek: Array.from(new Set(days as number[])).sort((a, b) => a - b) } }
    }
    case 'EVERY_N_DAYS': {
      const interval = input.intervalDays
      if (!Number.isInteger(interval) || (interval as number) < 1 || (interval as number) > 365) {
        return { ok: false, error: 'Repeat interval must be between 1 and 365 days' }
      }
      const anchor = typeof input.anchorDate === 'string' ? input.anchorDate : ''
      if (!isDateOnly(anchor)) return { ok: false, error: 'Starting date must be a valid date' }
      return { ok: true, recurrence: { type: 'EVERY_N_DAYS', intervalDays: interval as number, anchorDate: anchor } }
    }
    case 'MONTHLY': {
      const day = input.dayOfMonth
      if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) {
        return { ok: false, error: 'Day of month must be between 1 and 31' }
      }
      return { ok: true, recurrence: { type: 'MONTHLY', dayOfMonth: day as number } }
    }
    default:
      return { ok: false, error: 'Choose how this chore repeats' }
  }
}

/** UTC-midnight Date for a date-only string — the exact value Postgres stores for @db.Date. */
export function dateOnlyToDb(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

/** Today's date in the caller-provided timezone-naive sense (client passes its own date). */
export function dbDateToDateOnly(value: Date): string {
  return new Date(value.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 10)
}
