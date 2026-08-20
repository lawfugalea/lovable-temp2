import { RotateCcw, SkipForward } from 'lucide-react'
import { ChoreIcon } from '@/components/chores/ChoreIcon'
import { Button } from '@/components/ui/Button'
import { isResolved, type TodayChoreItem } from '@/lib/chore-view'
import { APP_LOCALE, cn } from '@/lib/utils'

interface ChoreRowProps {
  item: TodayChoreItem
  /** A request is in flight for this occurrence. Guards double taps. */
  busy: boolean
  compact?: boolean
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
}

function overdueLabel(dueDate: string) {
  const date = new Date(`${dueDate}T12:00:00Z`)
  // APP_LOCALE, not undefined: src/lib/utils.ts documents that Clankeep ships to
  // Malta and that a new formatter must not fall back to US conventions. The
  // previous version of this function passed undefined.
  return `was due ${date.toLocaleDateString(APP_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })}`
}

/**
 * One chore occurrence. Deliberately carries **no border or rounding** — the
 * flat list and the grouped list each supply their own container, so a group of
 * rows reads as one card with dividers rather than a stack of separate cards.
 */
export default function ChoreRow({ item, busy, compact = false, onResolve, onUndo }: ChoreRowProps) {
  const resolved = isResolved(item)
  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-card px-3 py-2.5 sm:px-4',
        compact && 'py-2',
        // A faint flash that settles back, so a completion registers even when
        // the row does not move between groups.
        resolved && 'animate-row-settle',
      )}
    >
      <button
        type="button"
        aria-busy={busy}
        onClick={() => (resolved ? onUndo(item) : onResolve(item, 'DONE'))}
        aria-label={resolved ? `Mark ${item.chore.title} not done` : `Mark ${item.chore.title} done`}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChoreIcon
          title={item.chore.title}
          icon={item.chore.icon}
          status={item.status}
          overdue={item.overdue}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', resolved && 'text-muted-foreground')}>
          <span className="relative inline-block max-w-full truncate align-bottom">
            {item.chore.title}
            {/* Drawn left to right on completion; `both` fill holds the end
                state, which is also where the reduced-motion clamp lands. */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-1/2 h-[1.5px] w-full origin-left bg-current',
                resolved ? 'animate-strike' : 'scale-x-0',
              )}
            />
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.overdue && !resolved ? (
            <span className="font-semibold text-brand-amber">{overdueLabel(item.dueDate)}</span>
          ) : (
            item.chore.schedule
          )}
          {item.chore.assignee && <> · {item.chore.assignee.name || 'Assigned'}</>}
          {item.status === 'DONE' && item.completedBy && <> · done by {item.completedBy.name || 'someone'}</>}
          {item.status === 'SKIPPED' && <> · skipped</>}
        </p>
      </div>

      {!resolved && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-busy={busy}
          onClick={() => onResolve(item, 'SKIPPED')}
          className="shrink-0 text-muted-foreground"
        >
          <SkipForward className="h-4 w-4" />
          {!compact && 'Skip'}
        </Button>
      )}
      {resolved && (
        /* Visible in compact mode too. It used to be hidden there, which left the
           dashboard with a working undo and no affordance for it. */
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-busy={busy}
          onClick={() => onUndo(item)}
          className="shrink-0 text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          {!compact && 'Undo'}
        </Button>
      )}
    </div>
  )
}
