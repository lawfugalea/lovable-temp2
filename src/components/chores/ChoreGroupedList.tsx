import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ListChecks } from 'lucide-react'
import ChoreRow from '@/components/chores/ChoreRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROW_TRANSITION } from '@/lib/motion'
import { choreProgress, groupTodayChores, todayItemKey, type TodayChoreItem } from '@/lib/chore-view'
import { cn } from '@/lib/utils'

interface ChoreGroupedListProps {
  items: TodayChoreItem[]
  busyKeys: ReadonlySet<string>
  /** The viewer's own YYYY-MM-DD; decides which resolved overdue rows still show. */
  localDate: string
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
  emptyAction?: React.ReactNode
}

/** Collapse Done once it would push the rest of the day off screen. */
const DONE_COLLAPSE_THRESHOLD = 3

/**
 * Today's chores as Overdue, Today and Done.
 *
 * AnimatePresence is used here and nowhere else in the app: a row resolving
 * moves between groups, and without it the rows left behind jump rather than
 * close the gap. Everything else animates in CSS.
 */
export default function ChoreGroupedList({
  items,
  busyKeys,
  localDate,
  onResolve,
  onUndo,
  emptyAction,
}: ChoreGroupedListProps) {
  const groups = groupTodayChores(items, localDate)
  const progress = choreProgress(groups)
  const [doneOpen, setDoneOpen] = useState(false)

  if (progress.total === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        module="chores"
        title="Nothing due today"
        description="Chores appear here on the days they are scheduled. Enjoy the quiet."
        action={emptyAction}
      />
    )
  }

  const showDone = groups.done.length > 0
  const collapsible = groups.done.length > DONE_COLLAPSE_THRESHOLD
  const doneVisible = !collapsible || doneOpen

  const section = (
    heading: string,
    rows: TodayChoreItem[],
    tone: string,
  ) => (
    <section aria-labelledby={`chore-group-${heading.toLowerCase()}`}>
      <h2
        id={`chore-group-${heading.toLowerCase()}`}
        className={cn('mb-1.5 px-1 text-xs font-bold uppercase tracking-wide', tone)}
      >
        {heading} <span className="font-semibold opacity-60">{rows.length}</span>
      </h2>
      {/* One card per group, with dividers between rows. `divide-y` applies to
          the motion.div children, which are the direct children here. */}
      <div className="divide-y overflow-hidden rounded-xl border">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map(item => (
            <motion.div
              key={todayItemKey(item)}
              layout
              initial={ROW_TRANSITION.initial}
              animate={ROW_TRANSITION.animate}
              exit={ROW_TRANSITION.exit}
            >
              <ChoreRow
                item={item}
                busy={busyKeys.has(todayItemKey(item))}
                onResolve={onResolve}
                onUndo={onUndo}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
        <p className="text-sm font-medium">
          {progress.done} of {progress.total} done
        </p>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" role="presentation">
          <div
            className="h-full rounded-full bg-module-chores transition-[width] duration-200"
            style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
          />
        </div>
      </div>

      {groups.overdue.length > 0 && section('Overdue', groups.overdue, 'text-brand-amber')}
      {groups.today.length > 0 && section('Today', groups.today, 'text-muted-foreground')}

      {showDone && (
        <div>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setDoneOpen(open => !open)}
              aria-expanded={doneOpen}
              className="mb-1.5 flex items-center gap-1 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              Done <span className="font-semibold opacity-60">{groups.done.length}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', doneOpen && 'rotate-180')} />
            </button>
          ) : null}
          {doneVisible && (collapsible
            ? section('Done', groups.done, 'sr-only')
            : section('Done', groups.done, 'text-muted-foreground'))}
        </div>
      )}
    </div>
  )
}
