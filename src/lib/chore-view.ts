import { cn } from './utils'

/**
 * The chores view model: types, grouping, and the presentation rules that both
 * the server-rendered page and the tests need.
 *
 * This module must stay free of Prisma. The client imports it, and the unit
 * suite must not open a database connection — every configured database URL in
 * this repo is production. src/lib/chores.ts holds the query side.
 */

export type ChoreStatus = 'PENDING' | 'DONE' | 'SKIPPED'

export interface ChoreSummary {
  id: string
  title: string
  notes: string | null
  schedule: string
  /** A semantic id from chore-icons.ts, or null meaning "infer from the title". */
  icon: string | null
  assignee: { id: string; name: string | null } | null
}

export interface TodayChoreItem {
  chore: ChoreSummary
  dueDate: string
  overdue: boolean
  status: ChoreStatus
  completedBy: { id: string; name: string | null } | null
  /** ISO timestamp of when this was resolved, or null while pending. */
  completedAt: string | null
}

export interface GroupedChores {
  overdue: TodayChoreItem[]
  today: TodayChoreItem[]
  done: TodayChoreItem[]
}

/**
 * `YYYY-MM-DD` in the viewer's own timezone.
 *
 * en-CA is used for its ISO ordering, not as a display locale — this value is a
 * machine-readable key that goes into API query strings and comparisons, so it
 * is deliberately *not* APP_LOCALE ('en-MT'). Anything shown to a person should
 * use APP_LOCALE from src/lib/utils.ts instead. The same trick already appears
 * in chores.tsx and dashboard.tsx, which this replaces.
 */
export function localDateOnly(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

export function localDateOf(isoTimestamp: string): string {
  return localDateOnly(new Date(isoTimestamp))
}

/** An occurrence is a chore *and* a due date; the same chore recurs. */
export function todayItemKey(item: TodayChoreItem): string {
  return `${item.chore.id}:${item.dueDate}`
}

export function isResolved(item: TodayChoreItem): boolean {
  return item.status !== 'PENDING'
}

/**
 * Whether a resolved **overdue** occurrence still belongs on the today screen.
 *
 * Kept only for the day it was resolved, so Undo stays reachable for as long as
 * anyone would plausibly want it without turning Today into a history log.
 *
 * Keying off the due date instead does not work: lastScheduledOnOrBefore returns
 * the same past date every day until the next occurrence, so a weekly chore
 * ticked late would sit in Done for six days.
 */
function keepResolvedOverdue(item: TodayChoreItem, localDate: string): boolean {
  if (!item.completedAt) return false
  return localDateOf(item.completedAt) === localDate
}

/**
 * Split today's occurrences into Overdue, Today and Done.
 *
 * `localDate` is the viewer's own `YYYY-MM-DD`. The decision is made here rather
 * than on the server so no timezone has to cross the API boundary — the same
 * reason /api/chores/today already takes a client-supplied date.
 */
export function groupTodayChores(items: TodayChoreItem[], localDate: string): GroupedChores {
  const groups: GroupedChores = { overdue: [], today: [], done: [] }
  for (const item of items) {
    if (!isResolved(item)) {
      if (item.overdue) groups.overdue.push(item)
      else groups.today.push(item)
      continue
    }
    // Due today: always shown, however long ago it was resolved. Overdue: only
    // for the day it was resolved.
    if (!item.overdue || keepResolvedOverdue(item, localDate)) groups.done.push(item)
  }
  return groups
}

export function choreProgress(groups: GroupedChores): { done: number; total: number } {
  return {
    done: groups.done.length,
    total: groups.overdue.length + groups.today.length + groups.done.length,
  }
}

/**
 * Classes for the 36px completion box.
 *
 * The overdue case carries **both** `animate-breathe` and a static
 * `border-brand-amber/60`. That is deliberate: globals.css neutralises every
 * animation under prefers-reduced-motion, and the amber ring is the only
 * non-textual overdue signal. Reduced motion should remove movement, not
 * meaning. Keep the static colour if you ever touch the keyframe.
 */
export function choreBoxClasses(status: ChoreStatus, overdue: boolean): string {
  return cn(
    'relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-200',
    status === 'DONE' && 'border-module-chores bg-module-chores text-white',
    status === 'SKIPPED' && 'border-muted-foreground/30 bg-muted text-muted-foreground',
    status === 'PENDING' && overdue && 'border-brand-amber/60 bg-background text-brand-amber animate-breathe',
    status === 'PENDING' && !overdue && 'border-input bg-background text-muted-foreground',
  )
}
