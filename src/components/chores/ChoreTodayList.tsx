import { Check, ListChecks, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export interface TodayChoreItem {
  chore: {
    id: string
    title: string
    notes: string | null
    schedule: string
    assignee: { id: string; name: string | null } | null
  }
  dueDate: string
  overdue: boolean
  status: 'PENDING' | 'DONE' | 'SKIPPED'
  completedBy: { id: string; name: string | null } | null
}

interface ChoreTodayListProps {
  items: TodayChoreItem[]
  busyKey: string | null
  compact?: boolean
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
  emptyAction?: React.ReactNode
}

function overdueLabel(dueDate: string) {
  const date = new Date(`${dueDate}T12:00:00Z`)
  return `was due ${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
}

export function todayItemKey(item: TodayChoreItem) {
  return `${item.chore.id}:${item.dueDate}`
}

export default function ChoreTodayList({ items, busyKey, compact = false, onResolve, onUndo, emptyAction }: ChoreTodayListProps) {
  if (!items.length) {
    if (compact) return null
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

  return (
    <div className={cn('divide-y rounded-xl border bg-card', compact && 'rounded-lg')}>
      {items.map(item => {
        const key = todayItemKey(item)
        const busy = busyKey === key
        const resolved = item.status !== 'PENDING'
        return (
          <div key={key} className={cn('flex items-center gap-3 px-3 py-2.5 sm:px-4', compact && 'py-2')}>
            <button
              type="button"
              disabled={busy}
              onClick={() => (resolved ? onUndo(item) : onResolve(item, 'DONE'))}
              aria-label={resolved ? `Mark ${item.chore.title} not done` : `Mark ${item.chore.title} done`}
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                item.status === 'DONE'
                  ? 'border-module-chores bg-module-chores text-white'
                  : item.status === 'SKIPPED'
                    ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
                    : 'border-input bg-background hover:border-module-chores',
              )}
            >
              {item.status === 'DONE' && <Check className="h-4 w-4" strokeWidth={3} />}
              {item.status === 'SKIPPED' && <SkipForward className="h-4 w-4" />}
            </button>

            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm font-medium', resolved && 'text-muted-foreground line-through')}>
                {item.chore.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {item.overdue ? (
                  <span className="font-semibold text-amber-600">{overdueLabel(item.dueDate)}</span>
                ) : (
                  item.chore.schedule
                )}
                {item.chore.assignee && <> · {item.chore.assignee.name || 'Assigned'}</>}
                {item.status === 'DONE' && item.completedBy && <> · done by {item.completedBy.name || 'someone'}</>}
                {item.status === 'SKIPPED' && <> · skipped</>}
              </p>
            </div>

            {!compact && !resolved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onResolve(item, 'SKIPPED')}
                className="shrink-0 text-muted-foreground"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            )}
            {!compact && resolved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onUndo(item)}
                className="shrink-0 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Undo
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
